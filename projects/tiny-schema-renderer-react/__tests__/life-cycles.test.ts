import { createElement, createRef } from 'react';
import { act, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SchemaRenderer, type SchemaRendererHandle } from '../src/RenderMain';

const g = globalThis as Record<string, unknown>;

describe('SchemaRenderer life cycles', () => {
  it('invokes old onUnmounted before applying the next schema, and does not run the new one immediately', async () => {
    const first = {
      componentName: 'Page',
      children: [{ componentName: 'div' }],
      lifeCycles: {
        onUnmounted: { type: 'JSFunction', value: `function() { globalThis.__firstUnmounted = true; }` },
      },
    };
    const second = {
      componentName: 'Page',
      children: [{ componentName: 'div' }],
      lifeCycles: {
        onUnmounted: { type: 'JSFunction', value: `function() { globalThis.__secondUnmounted = true; }` },
      },
    };

    const { rerender, unmount } = render(createElement(SchemaRenderer, { schema: first }));
    await new Promise((r) => setTimeout(r, 0));
    expect(g.__firstUnmounted).toBeUndefined();
    expect(g.__secondUnmounted).toBeUndefined();

    rerender(createElement(SchemaRenderer, { schema: second }));
    await new Promise((r) => setTimeout(r, 20));

    // 切换 schema 时，旧 onUnmounted 应执行，新 onUnmounted 不应立刻执行
    expect(g.__firstUnmounted).toBe(true);
    expect(g.__secondUnmounted).toBeUndefined();

    // 真实卸载时，应执行当前登记的 onUnmounted
    unmount();
    await new Promise((r) => setTimeout(r, 20));
    expect(g.__secondUnmounted).toBe(true);
  });

  it('waits for an asynchronous onUnmounted before initializing the next schema', async () => {
    let resolveUnmount!: () => void;
    g.__asyncUnmount = () => new Promise<void>((resolve) => (resolveUnmount = resolve));
    const rendererRef = createRef<SchemaRendererHandle>();
    const first = {
      componentName: 'Page',
      state: { version: 1 },
      children: [{ componentName: 'div' }],
      lifeCycles: {
        onUnmounted: { type: 'JSFunction' as const, value: 'function() { return globalThis.__asyncUnmount(); }' },
      },
    };
    const second = {
      componentName: 'Page',
      state: { version: 2 },
      children: [{ componentName: 'div' }],
    };

    const { rerender } = render(createElement(SchemaRenderer, { ref: rendererRef, schema: first }));
    rerender(createElement(SchemaRenderer, { ref: rendererRef, schema: second }));

    expect(rendererRef.current?.getContext().state).toEqual({ version: 1 });
    await act(async () => resolveUnmount());
    expect(rendererRef.current?.getContext().state).toEqual({ version: 2 });

    delete g.__asyncUnmount;
  });
});
