import { describe, expect, it } from 'vitest';
import { parseData } from '../src/engine';
import { NOTIFY } from '../src/engine/notify';

describe('Notify', () => {
  it('uses custom notify when schema function throws', () => {
    const titles: string[] = [];
    const ctx = {
      [NOTIFY]: (options: { title?: string }) => {
        if (options.title) titles.push(options.title);
      },
    };

    const fn = parseData(
      { type: 'JSFunction', value: 'function boom() { throw new Error("x"); }' },
      {},
      ctx,
    ) as () => void;

    fn();

    expect(titles[0]).toContain('boom');
  });
});
