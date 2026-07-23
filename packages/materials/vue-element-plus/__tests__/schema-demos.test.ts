import { describe, it, expect } from 'vitest';
import { createContext, parseSchemaValue, runLifeCycle } from '../test/schema-context';
import { demos } from '../test/mock';

function findComponent(schema: unknown, componentName: string): Record<string, unknown> | null {
  if (!schema || typeof schema !== 'object') {
    return null;
  }

  const node = schema as Record<string, unknown>;
  if (node.componentName === componentName) {
    return node;
  }

  const children = node.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      const found = findComponent(child, componentName);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

describe('schema demos', () => {
  demos.forEach(({ id, label, schema }) => {
    it(`${label} (${id}) has Page root`, () => {
      expect(schema.componentName).toBe('Page');
    });
  });

  it('form-binding demo submit updates submitResult', () => {
    const schema = demos.find((demo) => demo.id === 'form-binding')!.schema;
    const ctx = createContext(schema);
    const onClick = parseSchemaValue(
      { type: 'JSFunction', value: 'function() { this.handleSubmit(); }' },
      {},
      ctx,
    ) as () => void;

    onClick();
    expect((ctx.state as { submitResult: string }).submitResult).toContain('已提交：');
    expect((ctx.state as { formData: { name: string } }).formData.name).toBe('张三');
  });

  it('form-binding demo reset clears form state', () => {
    const schema = demos.find((demo) => demo.id === 'form-binding')!.schema;
    const ctx = createContext(schema);
    (ctx.state as { formData: { name: string } }).formData.name = '测试';
    (ctx.state as { submitResult: string }).submitResult = '已有结果';

    (ctx.handleReset as () => void)();
    expect((ctx.state as { formData: { name: string } }).formData.name).toBe('');
    expect((ctx.state as { submitResult: string }).submitResult).toBe('');
  });

  it('table demo onMounted loads tableData', () => {
    const schema = demos.find((demo) => demo.id === 'table')!.schema;
    const ctx = createContext(schema);

    expect((ctx.state as { tableData: unknown[] }).tableData).toEqual([]);
    runLifeCycle(ctx, 'onMounted');
    expect((ctx.state as { tableData: unknown[] }).tableData).toHaveLength(4);
  });

  it('table demo has no action column', () => {
    const schema = demos.find((demo) => demo.id === 'table')!.schema;
    const table = findComponent(schema, 'ElTable');
    const columns = (table?.children as Array<{ props?: { label?: string } }>) ?? [];

    expect(columns.some((column) => column.props?.label === '操作')).toBe(false);
  });

  it('table status tag resolves row expression', () => {
    const schema = demos.find((demo) => demo.id === 'table')!.schema;
    const ctx = createContext(schema);
    const tagType = parseSchemaValue(
      { type: 'JSExpression', value: "row.status === '在职' ? 'success' : 'info'" },
      { row: { status: '在职' } },
      ctx,
    );

    expect(tagType).toBe('success');
  });

  it('tabs demo handleTabChange updates activeTab', () => {
    const schema = demos.find((demo) => demo.id === 'tabs')!.schema;
    const ctx = createContext(schema);

    (ctx.handleTabChange as (key: string) => void)('detail');
    expect((ctx.state as { activeTab: string }).activeTab).toBe('detail');
  });
});
