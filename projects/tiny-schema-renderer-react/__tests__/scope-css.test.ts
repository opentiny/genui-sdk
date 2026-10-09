import { describe, expect, it } from 'vitest';
import { handleScopedCss } from '../src/engine/scope-css';

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
});
