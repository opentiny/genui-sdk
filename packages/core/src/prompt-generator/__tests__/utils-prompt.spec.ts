import { describe, expect, it } from 'vitest';
import { genUtilsPrompt } from '../utils';
import type { IUtilsMeta } from '../../material/materials-meta';

/**
 * 方案一（TS 类型字符串）对嵌套结构的支持验证：
 * - 函数参数/返回值中的内联嵌套对象、数组、联合类型原样渲染
 * - 泛型与复合类型（Record / Map / Array）原样渲染
 * - 递归自引用类型（TreeNode）原样渲染
 * - 类方法返回另一个类实例（嵌套类型引用）
 * - 单行类型行内代码、多行类型缩进代码块
 */
describe('genUtilsPrompt：TS 类型字符串对嵌套结构的支持', () => {
  describe('单行嵌套类型', () => {
    it('函数参数内联嵌套对象 + 数组返回值', () => {
      const meta: IUtilsMeta[] = [
        {
          name: 'saveUser',
          typeSchema: '(user: { name: string; dept: { name: string; leader: { name: string } } }) => Promise<Order[]>',
          usage: 'this.utils.saveUser({ name: "a", dept: { name: "研发部", leader: { name: "b" } } })',
        },
      ];
      const prompt = genUtilsPrompt(meta);
      // 嵌套类型字符串原样保留在行内代码中
      expect(prompt).toContain(
        '- `this.utils.saveUser`：`(user: { name: string; dept: { name: string; leader: { name: string } } }) => Promise<Order[]>`',
      );
      expect(prompt).toContain('- 示例：`this.utils.saveUser({ name: "a", dept: { name: "研发部", leader: { name: "b" } } })`');
    });

    it('联合类型与可空参数', () => {
      const meta: IUtilsMeta[] = [{ name: 'parseId', typeSchema: '(id: string | number | null, strict?: boolean) => number' }];
      const prompt = genUtilsPrompt(meta);
      expect(prompt).toContain('`(id: string | number | null, strict?: boolean) => number`');
    });

    it('泛型 + Record/Map/Array 复合嵌套', () => {
      const meta: IUtilsMeta[] = [
        { name: 'groupBy', typeSchema: '<T>(list: Array<Record<string, T>>, key: string | number) => Map<string, T[]>' },
      ];
      const prompt = genUtilsPrompt(meta);
      expect(prompt).toContain('`<T>(list: Array<Record<string, T>>, key: string | number) => Map<string, T[]>`');
    });
  });

  describe('多行嵌套类型（类/递归）', () => {
    it('递归自引用 TreeNode 类，渲染为缩进代码块且递归引用原样保留', () => {
      const meta: IUtilsMeta[] = [
        {
          name: 'TreeNode',
          typeSchema: 'class TreeNode {\n  value: any;\n  children?: TreeNode[];\n  parent?: TreeNode;\n}',
          usage: 'new this.utils.TreeNode()',
        },
      ];
      const prompt = genUtilsPrompt(meta);
      expect(prompt).toContain('```ts');
      expect(prompt).toContain('  class TreeNode {');
      expect(prompt).toContain('  children?: TreeNode[];');
      expect(prompt).toContain('  parent?: TreeNode;');
      expect(prompt).toContain('TreeNode[]');
    });

    it('类方法返回另一个类实例（嵌套类型引用）', () => {
      const meta: IUtilsMeta[] = [
        {
          name: 'OrderService',
          typeSchema:
            'class OrderService {\n  getOrder(id: string): Promise<Order>;\n  listOrders(filter: { status?: string; page: number }): Order[];\n}',
        },
      ];
      const prompt = genUtilsPrompt(meta);
      expect(prompt).toContain('getOrder(id: string): Promise<Order>;');
      expect(prompt).toContain('listOrders(filter: { status?: string; page: number }): Order[];');
    });
  });

  describe('边界', () => {
    it('空 utils 返回空字符串', () => {
      expect(genUtilsPrompt()).toBe('');
      expect(genUtilsPrompt([])).toBe('');
    });

    it('typeSchema 字符串中的类型字符（引号/括号/管道）不被破坏', () => {
      const meta: IUtilsMeta[] = [{ name: 'wrap', typeSchema: '(v: { a?: "x" | "y"; b: (n: number) => boolean }) => void' }];
      const prompt = genUtilsPrompt(meta);
      expect(prompt).toContain('`(v: { a?: "x" | "y"; b: (n: number) => boolean }) => void`');
    });
  });
});
