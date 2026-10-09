import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleScopedCss } from '../src/engine/scope-css';
import { setSchema } from '../src/set-schema';
import { createContextApi } from './render-context-api';

afterEach(() => {
  document.head.querySelectorAll('style[id^="data-schema-"]').forEach((styleSheet) => styleSheet.remove());
});

describe('handleScopedCss', () => {
  it('scopes element selectors with the schema id', async () => {
    const { css } = await handleScopedCss('data-schema-abc123', '.card { color: red; }');
    expect(css).toContain('.card[data-schema-abc123]');
  });

  it('scopes multiple selectors in a rule', async () => {
    const { css } = await handleScopedCss('data-schema-abc123', '.a, .b { color: red; }');
    expect(css).toContain('.a[data-schema-abc123]');
    expect(css).toContain('.b[data-schema-abc123]');
  });

  it('scopes descendant selector with a single attribute on the last node', async () => {
    const { css } = await handleScopedCss('data-schema-abc123', '.wrap .inner { color: red; }');
    expect(css).toContain('.wrap .inner[data-schema-abc123]');
    expect(css).not.toContain('.wrap[data-schema-abc123]');
  });

  it('prepends the scope attribute for pseudo-only selectors', async () => {
    const { css } = await handleScopedCss('data-schema-abc123', ':hover { color: red; }');
    expect(css).toContain('[data-schema-abc123]:hover');
  });

  it('creates and updates the page style sheet', async () => {
    const contextApi = createContextApi();
    await setSchema(
      { componentName: 'Page', children: [], css: '.card { color: red; }' },
      contextApi,
    );
    const id = contextApi.getContext().cssScopeId!;

    await vi.waitFor(() => {
      expect(document.getElementById(id)?.textContent).toContain(`.card[${id}]`);
    });

    await setSchema(
      { componentName: 'Page', children: [], css: '.card { color: blue; }' },
      contextApi,
    );
    await vi.waitFor(() => {
      expect(document.getElementById(id)?.textContent).toContain('color: blue');
    });
    expect(document.head.querySelectorAll(`#${id}`)).toHaveLength(1);
  });
});
