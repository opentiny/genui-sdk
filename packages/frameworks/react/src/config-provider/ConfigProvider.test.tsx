import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GenuiConfigProvider, useGenuiConfig } from './ConfigProvider';

function ConfigProbe() {
  return <span>{useGenuiConfig().colorScheme}</span>;
}

describe('GenuiConfigProvider theme', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('provides light by default', () => {
    const html = renderToStaticMarkup(
      <GenuiConfigProvider>
        <ConfigProbe />
      </GenuiConfigProvider>,
    );

    expect(html).toContain('light');
  });

  it('provides an explicit dark color scheme', () => {
    const html = renderToStaticMarkup(
      <GenuiConfigProvider theme="dark">
        <ConfigProbe />
      </GenuiConfigProvider>,
    );

    expect(html).toContain('dark');
  });

  it('uses a hydration-stable light value for the initial auto render', () => {
    const matchMedia = vi.fn(() => ({ matches: true }));
    vi.stubGlobal('window', { matchMedia });

    const html = renderToStaticMarkup(
      <GenuiConfigProvider theme="auto">
        <ConfigProbe />
      </GenuiConfigProvider>,
    );

    expect(html).toContain('light');
    expect(matchMedia).not.toHaveBeenCalled();
  });
});
