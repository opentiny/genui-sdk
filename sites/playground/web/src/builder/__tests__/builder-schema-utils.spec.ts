import { describe, expect, it } from 'vitest';
import {
  extractBuilderSchemaFromContent,
  extractTitleFromSchema,
  parsePreviewSchema,
  truncateText,
} from '../builder-schema-utils';

describe('extractBuilderSchemaFromContent', () => {
  it('extracts schema from a complete fenced block', () => {
    const content = 'prefix\n```schemaJson\n{"componentName":"Page"}\n```\nsuffix';
    expect(extractBuilderSchemaFromContent(content)).toBe('{"componentName":"Page"}');
  });

  it('extracts schema from an unclosed fence at stream end', () => {
    const content = '```schemaJson\n{"componentName":"Page"}';
    expect(extractBuilderSchemaFromContent(content)).toBe('{"componentName":"Page"}');
  });

  it('returns empty string when marker is missing', () => {
    expect(extractBuilderSchemaFromContent('no schema here')).toBe('');
  });
});

describe('parsePreviewSchema', () => {
  it('parses valid JSON object', () => {
    expect(parsePreviewSchema('{"a":1}')).toEqual({ a: 1 });
  });

  it('returns null for empty input', () => {
    expect(parsePreviewSchema('')).toBeNull();
    expect(parsePreviewSchema('   ')).toBeNull();
  });
});

describe('extractTitleFromSchema', () => {
  it('uses the first Text component title', () => {
    const schema = JSON.stringify({
      componentName: 'Page',
      children: [{ componentName: 'Text', props: { text: 'Hello World Title' } }],
    });
    expect(extractTitleFromSchema(schema)).toBe('Hello World Title');
  });

  it('falls back to truncated user input', () => {
    expect(extractTitleFromSchema('{}', 'fallback input text')).toBe('fallback input text');
  });
});

describe('truncateText', () => {
  it('keeps short text unchanged', () => {
    expect(truncateText('short title')).toBe('short title');
  });

  it('truncates long text with ellipsis', () => {
    expect(truncateText('a'.repeat(25))).toBe(`${'a'.repeat(20)}...`);
  });
});
