import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { loadSkillGenerateConfig, resolveConfigPath } from '../cli';

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
  it('loadSkillGenerateConfig 解析相对路径', () => {
    const configPath = new URL('../../config.json', import.meta.url);
    const { config, configDir } = loadSkillGenerateConfig(fileURLToPath(configPath));

    expect(config.materialsMetaModule).toContain('meta.js');
    expect(config.skillDirs).toHaveLength(1);
    expect(resolveConfigPath(configDir, config.skillDirs[0])).toBe(
      resolve(configDir, 'skills/genui-schema-json'),
    );
    expect(config.framework).toBe('vue');
    expect(config.tgCustomConfig?.customActions?.map(({ name }) => name)).toEqual([
      'continueChat',
      'saveState',
    ]);
  });

  it('真实配置显式透传 Playground 内置 Action', () => {
    const configPath = new URL('../../config.json', import.meta.url);
    const { config } = loadSkillGenerateConfig(fileURLToPath(configPath));

    expect(config.tgCustomConfig?.customActions).toHaveLength(2);
    expect(config.tgCustomConfig?.customActions?.map(({ name }) => name)).toEqual([
      'continueChat',
      'saveState',
    ]);
    expect(config.promptOptions?.isSkill).toBe(true);
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
