import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { AntIcon } from '../src/materials/components/AntIcon';

describe('AntIcon', () => {
  it('透传渲染器注入的属性（className/style/data-*/css 作用域）', () => {
    const html = renderToStaticMarkup(
      <AntIcon
        name="SearchOutlined"
        className="my-icon"
        style={{ color: 'red' }}
        data-id="node-1"
        data-tag="AntIcon"
        data-schema-abc123=""
      />,
    );

    expect(html).toContain('data-id="node-1"');
    expect(html).toContain('data-tag="AntIcon"');
    expect(html).toContain('data-schema-abc123=""');
    expect(html).toContain('style="color:red"');
    expect(html).toContain('my-icon');
    expect(html).toContain('<svg');
  });

  it('缺省或空 name 渲染为空', () => {
    expect(renderToStaticMarkup(<AntIcon />)).toBe('');
    expect(renderToStaticMarkup(<AntIcon name="" />)).toBe('');
  });

  it('name 命中非图标导出时不会抛错', () => {
    // @ant-design/icons 的命名空间还包含 default(Icon)、createFromIconfontCN 等非图标导出，
    // 这里的白名单映射表必须把它们排除掉，否则会触发 React 渲染报错。
    for (const name of ['default', 'createFromIconfontCN', 'getTwoToneColor', 'IconProvider']) {
      expect(() => renderToStaticMarkup(<AntIcon name={name} />)).not.toThrow();
      expect(renderToStaticMarkup(<AntIcon name={name} />)).toBe('');
    }
  });

  it('name 命中对象原型上的属性时不会抛错', () => {
    // 映射表是对象字面量，会继承 Object.prototype 上的键；
    // 这些键必须在查找时排除，否则会把非图标值当作组件渲染。
    for (const name of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
      expect(() => renderToStaticMarkup(<AntIcon name={name} />)).not.toThrow();
      expect(renderToStaticMarkup(<AntIcon name={name} />)).toBe('');
    }
    expect(renderToStaticMarkup(<AntIcon name="NotARealOutlined" />)).toBe('');
  });
});
