import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
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
  /** 导出 materialsMeta 的模块路径（相对配置文件目录或绝对路径） */
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
export async function runSkillGenerateCli(configPath: string): Promise<void> {
  const { config, configDir } = loadSkillGenerateConfig(configPath);
  const materialsModulePath = resolveConfigPath(configDir, config.materialsMetaModule);
  const materialsModule = (await import(pathToFileURL(materialsModulePath).href)) as Record<
    string,
    IMaterialsMeta
  >;
  const exportName = config.materialsMetaExport || 'materialsMeta';
  const materialsMeta = materialsModule[exportName];

  if (!materialsMeta) {
    throw new Error(`模块未导出 ${exportName}: ${materialsModulePath}`);
  }

  const result = generateSkillFiles(config.framework ?? 'vue', materialsMeta, {
    skillDirs: config.skillDirs.map((dir) => resolveConfigPath(configDir, dir)),
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
