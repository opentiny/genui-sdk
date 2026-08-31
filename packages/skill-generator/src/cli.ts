import { readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type {
  IGenPromptCustomConfig,
  IGenPromptFramework,
  IGenPromptFrameworkConfig,
  IGenPromptOptions,
  IMaterialsMeta,
} from '@opentiny/genui-sdk-core';
import { resolveSkillBodyFormatter } from './formatters/index.js';
import { generateSkillFiles } from './skill-generator.js';

/** CLI 配置文件结构 */
export interface ISkillGenerateConfig {
  /** 框架名或框架配置；默认 vue */
  framework?: IGenPromptFramework | IGenPromptFrameworkConfig;
  /** 导出 materialsMeta 的模块路径或包名导入 specifier */
  materialsMetaModule: string;
  /** materialsMeta 导出名；默认 materialsMeta */
  materialsMetaExport?: string;
  /** skill 输出目录列表；frontmatter 从首个目录的 SKILL.md 读取 */
  skillDirs: string[];
  /** genPrompt 自定义配置 */
  tgCustomConfig?: IGenPromptCustomConfig;
  /** 传给 genPrompt 的选项 */
  promptOptions?: IGenPromptOptions;
  /** 可选，内置 SKILL.md 附加正文 formatter 名称，见 SKILL_BODY_FORMATTERS */
  skillBodyFormatter?: string;
  /** genPrompt 章节子目录，默认 generated */
  referenceSubdir?: string;
  /** 是否同步白名单到手写 components.md；默认 true */
  syncComponentsIndex?: boolean;
  /** 是否清理生成子目录中的过期文件；默认 true */
  prune?: boolean;
}

export interface ISkillGenerateCliOptions {
  /** 相对 skillDirs 的解析基准；省略时使用配置文件所在目录 */
  outputBaseDir?: string;
  /** 覆盖配置文件中的 skillDirs，通常来自 --out */
  skillDirs?: string[];
}

export interface IParsedSkillGenerateArgs {
  configPath: string;
  options: ISkillGenerateCliOptions;
  help: boolean;
}

/**
 * 将配置中的路径解析为绝对路径。
 *
 * @param configDir - 配置文件所在目录
 * @param targetPath - 配置中的路径
 * @returns 绝对路径
 */
export function resolveConfigPath(configDir: string, targetPath: string): string {
  return resolve(configDir, targetPath);
}

export function createSkillGenerateUsage(commandName = 'genui-skill-generate'): string {
  return `用法:
  ${commandName}
  ${commandName} --out ./skills/my-skill
  ${commandName} --config ./genui-skill.config.json
  ${commandName} ./genui-skill.config.json

选项:
  --out <dir>       指定最终 skill 输出目录
  --config <file>   指定配置文件
  -h, --help        显示帮助`;
}

export function parseSkillGenerateArgs(
  args: string[],
  context: { defaultConfigPath: string; cwd?: string } | string,
): IParsedSkillGenerateArgs {
  const defaultConfigPath = typeof context === 'string' ? context : context.defaultConfigPath;
  const cwd = typeof context === 'string' ? process.cwd() : context.cwd ?? process.cwd();
  let configPath: string | undefined;
  let outDir: string | undefined;
  let help = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '-h' || arg === '--help') {
      help = true;
      continue;
    }

    if (arg === '--config') {
      const value = args[index + 1];
      if (!value || value.startsWith('-')) {
        throw new Error('--config 需要指定配置文件路径');
      }
      configPath = value;
      index += 1;
      continue;
    }

    if (arg.startsWith('--config=')) {
      configPath = arg.slice('--config='.length);
      continue;
    }

    if (arg === '--out') {
      const value = args[index + 1];
      if (!value || value.startsWith('-')) {
        throw new Error('--out 需要指定输出目录');
      }
      outDir = value;
      index += 1;
      continue;
    }

    if (arg.startsWith('--out=')) {
      outDir = arg.slice('--out='.length);
      continue;
    }

    if (arg.startsWith('-')) {
      throw new Error(`未知选项: ${arg}`);
    }

    if (configPath) {
      throw new Error(`只能指定一个配置文件: ${arg}`);
    }

    configPath = arg;
  }

  const hasExplicitConfig = Boolean(configPath);
  const resolvedConfigPath = configPath ?? defaultConfigPath;
  const options: ISkillGenerateCliOptions = hasExplicitConfig ? {} : { outputBaseDir: cwd };

  if (outDir) {
    options.skillDirs = [outDir];
    options.outputBaseDir = cwd;
  }

  return { configPath: resolvedConfigPath, options, help };
}

export function resolveConfiguredSkillDirs(
  config: ISkillGenerateConfig,
  baseDir: string,
  overrideSkillDirs?: string[],
): string[] {
  return (overrideSkillDirs ?? config.skillDirs).map((dir) => resolveConfigPath(baseDir, dir));
}

function isPathSpecifier(specifier: string): boolean {
  return (
    specifier.startsWith('.') ||
    specifier.startsWith('/') ||
    /^[a-zA-Z]:[\\/]/.test(specifier)
  );
}

async function importMaterialsModule(
  materialsMetaModule: string,
  configDir: string,
): Promise<Record<string, IMaterialsMeta>> {
  const moduleSpecifier = isPathSpecifier(materialsMetaModule)
    ? pathToFileURL(
        isAbsolute(materialsMetaModule)
          ? materialsMetaModule
          : resolveConfigPath(configDir, materialsMetaModule),
      ).href
    : materialsMetaModule;

  return (await import(moduleSpecifier)) as Record<string, IMaterialsMeta>;
}

/**
 * 读取并解析 skill 生成配置文件。
 *
 * @param configPath - 配置文件绝对路径
 * @returns 解析后的配置与配置目录
 */
export function loadSkillGenerateConfig(configPath: string): {
  config: ISkillGenerateConfig;
  configDir: string;
} {
  const absoluteConfigPath = resolve(configPath);
  const configDir = dirname(absoluteConfigPath);
  const config = JSON.parse(readFileSync(absoluteConfigPath, 'utf8')) as ISkillGenerateConfig;

  if (!config.materialsMetaModule || !config.skillDirs?.length) {
    throw new Error('配置文件需包含 materialsMetaModule、skillDirs');
  }

  return { config, configDir };
}

/**
 * 根据配置文件生成 skill 文件。
 *
 * @param configPath - 配置文件路径
 */
export async function runSkillGenerateCli(
  configPath: string,
  options: ISkillGenerateCliOptions = {},
): Promise<void> {
  const { config, configDir } = loadSkillGenerateConfig(configPath);
  const outputBaseDir = options.outputBaseDir ?? configDir;
  const materialsModule = await importMaterialsModule(config.materialsMetaModule, configDir);
  const exportName = config.materialsMetaExport || 'materialsMeta';
  const materialsMeta = materialsModule[exportName];

  if (!materialsMeta) {
    throw new Error(`模块未导出 ${exportName}: ${config.materialsMetaModule}`);
  }

  const result = generateSkillFiles(config.framework ?? 'vue', materialsMeta, {
    skillDirs: resolveConfiguredSkillDirs(config, outputBaseDir, options.skillDirs),
    tgCustomConfig: config.tgCustomConfig,
    promptOptions: config.promptOptions,
    referenceSubdir: config.referenceSubdir,
    syncComponentsIndex: config.syncComponentsIndex,
    prune: config.prune,
    formatSkillBody: config.skillBodyFormatter
      ? resolveSkillBodyFormatter(config.skillBodyFormatter)
      : undefined,
  });

  console.log(
    `Generated skill → ${result.skillDirs.join(', ')} (${result.sectionMarkers.length} reference files)`,
  );
}
