import { repairJson } from '@opentiny/genui-sdk-core';

const SCHEMA_JSON_START = '```schemaJson';

export const BUILDER_CARD_TITLE_MAX_LEN = 20;

export function truncateText(text: string, maxLen = BUILDER_CARD_TITLE_MAX_LEN) {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) {
    return trimmed;
  }
  return `${trimmed.substring(0, maxLen)}...`;
}

function findFirstTextInSchema(node: unknown): string {
  if (!node || typeof node !== 'object') {
    return '';
  }

  const record = node as Record<string, unknown>;
  if (record.componentName === 'Text' && record.props && typeof record.props === 'object') {
    const text = (record.props as Record<string, unknown>).text;
    if (typeof text === 'string' && text.trim()) {
      return text.trim();
    }
  }

  const children = record.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      const found = findFirstTextInSchema(child);
      if (found) {
        return found;
      }
    }
  }

  return '';
}

export function formatCardSchemaText(schemaStr: string) {
  const trimmed = schemaStr?.trim();
  if (!trimmed) {
    return '{}';
  }

  const parsed = parsePreviewSchema(trimmed);
  if (parsed) {
    return JSON.stringify(parsed, null, 2);
  }

  return trimmed;
}

export function extractBuilderSchemaFromContent(content: string) {
  const startIdx = content.indexOf(SCHEMA_JSON_START);
  if (startIdx === -1) {
    return '';
  }

  const jsonStart = content.indexOf('\n', startIdx);
  if (jsonStart === -1) {
    return '';
  }

  const bodyStart = jsonStart + 1;
  const lastFenceIdx = content.lastIndexOf('\n```');
  if (lastFenceIdx > bodyStart) {
    return content.slice(bodyStart, lastFenceIdx).trim();
  }

  return content.slice(bodyStart).trim();
}

export function parsePreviewSchema(schemaStr: string) {
  const trimmed = schemaStr?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch {
    const { value } = repairJson(trimmed);
    if (value && typeof value === 'object') {
      return value;
    }
    return null;
  }

  return null;
}

export function extractTitleFromSchema(schemaStr: string, fallbackInput = '') {
  const parsed = parsePreviewSchema(schemaStr);
  if (parsed) {
    const title = findFirstTextInSchema(parsed);
    if (title) {
      return truncateText(title);
    }
  }

  return truncateText(fallbackInput);
}

export interface IBuilderCardMessageItem {
  type: 'builder-card';
  id: string;
  title: string;
  input: string;
  schema: string;
  createdTime: string;
}
