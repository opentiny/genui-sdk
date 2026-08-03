import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadSkillGenerateConfig, resolveConfigPath } from '../cli';

describe('cli', () => {
  it('loadSkillGenerateConfig 解析相对路径', () => {
    const configPath = new URL('../../examples/genui-schema-json.config.json', import.meta.url);
    const { config, configDir } = loadSkillGenerateConfig(fileURLToPath(configPath));

    expect(config.materialsMetaModule).toContain('meta.js');
    expect(config.skillDirs).toHaveLength(1);
    expect(resolveConfigPath(configDir, config.skillDirs[0])).toContain('skills/genui-schema-json');
    expect(config.framework).toBe('vue');
  });
});
