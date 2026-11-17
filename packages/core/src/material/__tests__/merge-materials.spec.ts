import { describe, expect, it } from 'vitest';
import { mergeMaterials } from '../merge-materials';

describe('mergeMaterials', () => {
  it('按名字合并 modules，空表不能盖掉已有的 NgModule', () => {
    const tiTableModule = { name: 'TiTableModule' };
    const merged = mergeMaterials(
      {
        components: { TiTable: { name: 'TiTable' }, TiCard: { name: 'TiCard' } },
        modules: { TiTable: tiTableModule, TiCard: { name: 'TiCardModule' } },
        directives: { tiCol: { name: 'tiCol' } },
      },
      {
        components: { MatButton: { name: 'MatButton' } },
        modules: {},
        directives: { matInput: { name: 'matInput' } },
        autoApplyDirectives: { matInput: () => true },
      },
    );

    expect(merged['components']).toMatchObject({
      TiTable: { name: 'TiTable' },
      TiCard: { name: 'TiCard' },
      MatButton: { name: 'MatButton' },
    });
    expect(merged['modules']).toEqual({
      TiTable: tiTableModule,
      TiCard: { name: 'TiCardModule' },
    });
    expect(merged['directives']).toEqual({
      tiCol: { name: 'tiCol' },
      matInput: { name: 'matInput' },
    });
    expect(Object.keys(merged['autoApplyDirectives'] as object)).toEqual(['matInput']);
  });

  it('同名 module 以后面的为准', () => {
    const first = { name: 'first' };
    const second = { name: 'second' };
    const merged = mergeMaterials(
      { modules: { Shared: first } },
      { modules: { Shared: second } },
    );
    expect(merged['modules']).toEqual({ Shared: second });
  });
});
