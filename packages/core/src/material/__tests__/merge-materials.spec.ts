import { describe, expect, it } from 'vitest';
import type { MaterialsRuntimeFactory, MergedMaterials } from '../index';
import { mergeMaterials } from '../merge-materials';

function createRuntimeFactory(): MaterialsRuntimeFactory {
  return () => ({
    apply: () => ({}),
  });
}

describe('mergeMaterials', () => {
  it('keeps one runtime factory for each UI library', () => {
    const tinyFactory = createRuntimeFactory();
    const elementPlusFactory = createRuntimeFactory();

    const merged = mergeMaterials(
      { runtimeFactory: tinyFactory },
      { runtimeFactory: elementPlusFactory },
      { runtimeFactory: tinyFactory },
    );

    expect(merged.runtimeFactory).toEqual([tinyFactory, elementPlusFactory]);
  });

  it('flattens runtime factories from previously merged materials', () => {
    const tinyFactory = createRuntimeFactory();
    const elementPlusFactory = createRuntimeFactory();
    const previouslyMerged: MergedMaterials = {
      runtimeFactory: [tinyFactory, elementPlusFactory],
    };

    const merged = mergeMaterials(previouslyMerged);

    expect(merged.runtimeFactory).toEqual([tinyFactory, elementPlusFactory]);
  });

  it('preserves existing material merge behavior', () => {
    const merged = mergeMaterials(
      {
        components: { Button: 'first' },
        requiredCompleteFieldSelectors: ['first', 'shared'],
        defaultPropsMap: { Button: { type: 'primary' } },
      },
      {
        components: { Button: 'second', Input: 'input' },
        requiredCompleteFieldSelectors: ['shared', 'second'],
        defaultPropsMap: { Input: { clearable: true } },
      },
    );

    expect(merged.components).toEqual({ Button: 'second', Input: 'input' });
    expect(merged.requiredCompleteFieldSelectors).toEqual(['first', 'shared', 'second']);
    expect(merged.defaultPropsMap).toEqual({
      Button: { type: 'primary' },
      Input: { clearable: true },
    });
  });
});
