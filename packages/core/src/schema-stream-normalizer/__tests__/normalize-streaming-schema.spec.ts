import { describe, expect, it } from 'vitest';
import { normalizeStreamingSchema } from '../normalize-streaming-schema';

describe('normalizeStreamingSchema', () => {
  it('keeps lifeCycles unchanged when schema-json is complete', () => {
    const schema = {
      componentName: 'Page',
      lifeCycles: {
        onMounted: { type: 'JSFunction', value: 'function() {}' },
      },
    };

    expect(normalizeStreamingSchema(schema, true)).toBe(schema);
    expect(normalizeStreamingSchema(schema, true).lifeCycles).toEqual(schema.lifeCycles);
  });

  it('replaces lifeCycles with {} while streaming', () => {
    const schema = {
      componentName: 'Page',
      lifeCycles: {
        onMounted: { type: 'JSFunction', value: 'function() {' },
      },
    };

    expect(normalizeStreamingSchema(schema, false)).toEqual({
      componentName: 'Page',
      lifeCycles: {},
    });
    expect(schema.lifeCycles).not.toEqual({});
  });

  it('does not mutate schema without lifeCycles', () => {
    const schema = { componentName: 'Page' };
    expect(normalizeStreamingSchema(schema, false)).toBe(schema);
  });

  it('keeps explicit empty lifeCycles as {} while streaming', () => {
    const schema = { componentName: 'Page', lifeCycles: {} };

    expect(normalizeStreamingSchema(schema, false)).toEqual({
      componentName: 'Page',
      lifeCycles: {},
    });
    expect(normalizeStreamingSchema(schema, false)).not.toBe(schema);
  });

  it('normalizes when lifeCycles key exists but value is undefined', () => {
    const schema = { componentName: 'Page', lifeCycles: undefined };

    expect(normalizeStreamingSchema(schema, false)).toEqual({
      componentName: 'Page',
      lifeCycles: {},
    });
  });

  it('returns non-object inputs unchanged', () => {
    expect(normalizeStreamingSchema(null as unknown as Record<string, unknown>, false)).toBe(null);
    expect(normalizeStreamingSchema('text' as unknown as Record<string, unknown>, false)).toBe('text');
  });
});
