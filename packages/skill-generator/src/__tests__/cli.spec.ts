import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import {
  loadSkillGenerateConfig,
  parseSkillGenerateArgs,
  resolveConfigPath,
  runSkillGenerateCli,
} from '../cli';

const tempDirs: string[] = [];

function createTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('cli', () => {
  it('parseSkillGenerateArgs 支持零配置默认运行', () => {
    const parsed = parseSkillGenerateArgs([], {
      defaultConfigPath: '/pkg/config.json',
      cwd: '/user/project',
    });

    expect(parsed).toEqual({
      configPath: '/pkg/config.json',
      options: { outputBaseDir: '/user/project' },
      help: false,
    });
  });

  it('parseSkillGenerateArgs 支持 --out 覆盖最终 skill 目录', () => {
    const parsed = parseSkillGenerateArgs(['--out', './skills/my-skill'], {
      defaultConfigPath: '/pkg/config.json',
      cwd: '/user/project',
    });

    expect(parsed.configPath).toBe('/pkg/config.json');
    expect(parsed.options).toEqual({
      outputBaseDir: '/user/project',
      skillDirs: ['./skills/my-skill'],
    });
  });

  it('parseSkillGenerateArgs 支持 --config 和旧的位置参数', () => {
    expect(
      parseSkillGenerateArgs(['--config', './genui-skill.config.json'], {
        defaultConfigPath: '/pkg/config.json',
        cwd: '/user/project',
      }).configPath,
    ).toBe('./genui-skill.config.json');
    expect(
      parseSkillGenerateArgs(['./legacy.config.json'], {
        defaultConfigPath: '/pkg/config.json',
        cwd: '/user/project',
      }).configPath,
    ).toBe('./legacy.config.json');
  });

  it('parseSkillGenerateArgs 拒绝未知参数', () => {
    expect(() =>
      parseSkillGenerateArgs(['--bad'], {
        defaultConfigPath: '/pkg/config.json',
        cwd: '/user/project',
      }),
    ).toThrow(/未知选项/);
  });

  it('loadSkillGenerateConfig 解析真实配置及相对路径', () => {
    const configPath = new URL('../../config.json', import.meta.url);
    const { config, configDir } = loadSkillGenerateConfig(fileURLToPath(configPath));

    expect(config.materialsMetaModule).toBe('@opentiny/genui-sdk-materials-vue-opentiny-vue/meta');
    expect(config.skillDirs).toHaveLength(1);
    expect(resolveConfigPath(configDir, config.skillDirs[0])).toBe(
      resolve(configDir, 'skills/genui-schema-json'),
    );
    expect(config.framework).toBe('vue');
    expect(config.tgCustomConfig?.customActions?.map(({ name }) => name)).toEqual([
      'continueChat',
      'saveState',
    ]);
    expect(config.promptOptions?.isSkill).toBe(true);
  });

  it('默认配置可按用户目录输出 skill', async () => {
    const configPath = new URL('../../config.json', import.meta.url);
    const outputBaseDir = createTempDir('skill-cli-output-');

    await runSkillGenerateCli(fileURLToPath(configPath), { outputBaseDir });

    expect(existsSync(join(outputBaseDir, 'skills', 'genui-schema-json', 'SKILL.md'))).toBe(
      true,
    );
    expect(
      existsSync(
        join(
          outputBaseDir,
          'skills',
          'genui-schema-json',
          'reference',
          'generated',
          'components.md',
        ),
      ),
    ).toBe(true);
  });

  it('--out 可覆盖最终 skill 输出目录', async () => {
    const configPath = new URL('../../config.json', import.meta.url);
    const outputBaseDir = createTempDir('skill-cli-out-base-');

    await runSkillGenerateCli(fileURLToPath(configPath), {
      outputBaseDir,
      skillDirs: ['./custom-skill'],
    });

    expect(existsSync(join(outputBaseDir, 'custom-skill', 'SKILL.md'))).toBe(true);
    expect(existsSync(join(outputBaseDir, 'skills', 'genui-schema-json', 'SKILL.md'))).toBe(
      false,
    );
  });


  it.each([
    ['缺少 materialsMetaModule', { skillDirs: ['./skill'] }],
    ['skillDirs 为空', { materialsMetaModule: './meta.js', skillDirs: [] }],
  ])('%s 时拒绝配置', (_name, config) => {
    const dir = createTempDir('skill-cli-invalid-');
    const configPath = join(dir, 'config.json');
    writeFileSync(configPath, JSON.stringify(config), 'utf8');

    expect(() => loadSkillGenerateConfig(configPath)).toThrow(
      /materialsMetaModule、skillDirs/,
    );
  });

  it('JSON 格式错误时保留解析异常', () => {
    const dir = createTempDir('skill-cli-json-');
    const configPath = join(dir, 'config.json');
    writeFileSync(configPath, '{ invalid json', 'utf8');

    expect(() => loadSkillGenerateConfig(configPath)).toThrow(SyntaxError);
  });
});
