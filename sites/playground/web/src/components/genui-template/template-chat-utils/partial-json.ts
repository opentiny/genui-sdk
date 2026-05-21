import { parsePartialJson } from 'ai';

/**
 * 将文本解析为 JSON
 * @param text 文本
 * @returns 解析后的 JSON
 */
export const textToJson = async (text: string) => parsePartialJson(text);

/**
 * 解析部分 JSON 状态
 */
export const PARSE_PARTIAL_JSON_STATE = {
  SUCCESSFUL_PARSE: 'successful-parse',
  FAILED_PARSE: 'failed-parse',
  REPAIRED_PARSE: 'repaired-parse',
  UNDEFINED_INPUT: 'undefined-input',
} as const;
