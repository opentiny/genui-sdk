import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GenuiConfigProvider, useGenuiConfig } from './ConfigProvider';

function ConfigProbe() {
  return <span>{useGenuiConfig().colorScheme}</span>;
}

describe('GenuiConfigProvider theme', () => {
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
});
