import type { IPromptSectionMarker } from '../skill-generator.js';
import { buildGenuiSchemaSkillBody } from './genui-schema-json.js';

/** SKILL.md 附加正文 formatter 函数签名 */
export type SkillBodyFormatter = (sectionMarkers: IPromptSectionMarker[]) => string;

/** 包内置 formatter 注册表 */
export const SKILL_BODY_FORMATTERS: Record<string, SkillBodyFormatter> = {
  'genui-schema-json': buildGenuiSchemaSkillBody,
};

/**
 * 按名称解析内置 formatter。
 *
 * @param name - formatter 名称，见 {@link SKILL_BODY_FORMATTERS}
 * @returns 对应的 formatter 函数
 * @throws 名称未知时抛出错误
 */
export function resolveSkillBodyFormatter(name: string): SkillBodyFormatter {
  const formatter = SKILL_BODY_FORMATTERS[name];
  if (!formatter) {
    const available = Object.keys(SKILL_BODY_FORMATTERS).join(', ');
    throw new Error(`未知的 skillBodyFormatter: ${name}，可用: ${available}`);
  }
  return formatter;
}

export { buildGenuiSchemaSkillBody } from './genui-schema-json.js';
