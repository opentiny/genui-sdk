import { parsePartialJson } from 'ai';

export const textToJson = async (text: string) => parsePartialJson(text);

export const PARSE_PARTIAL_JSON_STATE = {
  SUCCESSFUL_PARSE: 'successful-parse',
  FAILED_PARSE: 'failed-parse',
  REPAIRED_PARSE: 'repaired-parse',
  UNDEFINED_INPUT: 'undefined-input',
} as const;
