import { applyDefaultPropsToProps, type DefaultPropsMap, type PropsValue } from '../src/apply-default-props';

const COMPONENT = 'Select';

const defaultPropsMap: DefaultPropsMap = {
  [COMPONENT]: {
    placeholder: '请选择',
    type: 'primary',
    clearable: true,
    'style.color': '#333',
    'options.*.label': '默认标签',
    meta: { },
    'meta.nested': {},
    'meta.nested.count': 1,
  },
};

const schemaProps: Record<string, PropsValue> = {
  size: 'small',
  type: 'danger',
  style: {},
  options: [
    { value: 'a' },
    { value: 'b', label: '已有标签' },
    null,
    'invalid-item',
  ],
};

function cloneSchemaProps(): Record<string, PropsValue> {
  return structuredClone(schemaProps);
}

function applyDefaults(props: Record<string, PropsValue>): void {
  applyDefaultPropsToProps(COMPONENT, props, defaultPropsMap);
}

describe('applyDefaultPropsToProps', () => {
  it('补齐 schema 中缺失的叶子属性', () => {
    const props = cloneSchemaProps();
    applyDefaults(props);

    expect(props['size']).toBe('small');
    expect(props['placeholder']).toBe('请选择');
    expect(props['clearable']).toBe(true);
  });

  it('不覆盖 schema 中已有的值', () => {
    const props = cloneSchemaProps();
    applyDefaults(props);

    expect(props['type']).toBe('danger');
  });

  it('路径已存在时补齐嵌套叶子属性', () => {
    const props = cloneSchemaProps();
    applyDefaults(props);

    expect(props['style']).toEqual({ color: '#333' });
  });

  it('中间路径不存在时跳过嵌套默认值', () => {
    const props = cloneSchemaProps();
    delete props['style'];
    applyDefaults(props);

    expect(props['style']).toBeUndefined();
  });

  it('通配路径为 options 每一项补齐 label', () => {
    const props = cloneSchemaProps();
    applyDefaults(props);

    const options = props['options'] as PropsValue[];
    expect(options[0]).toEqual({ value: 'a', label: '默认标签' });
    expect(options[1]).toEqual({ value: 'b', label: '已有标签' });
    expect(options[2]).toBeNull();
    expect(options[3]).toBe('invalid-item');
  });

  it('中间路径不存在时跳过数组下标路径', () => {
    const props: Record<string, PropsValue> = {};
    applyDefaultPropsToProps(COMPONENT, props, {
      [COMPONENT]: { 'options.0.label': '首项默认' },
    });

    expect(props['options']).toBeUndefined();
  });

  it('通配路径在 options 不是数组时按对象键名读取', () => {
    const props: Record<string, PropsValue> = {
      options: { '*': { value: 'a' } },
    };
    applyDefaultPropsToProps(COMPONENT, props, {
      [COMPONENT]: { 'options.*.label': '默认标签' },
    });

    expect((props['options'] as Record<string, PropsValue>)['*']).toEqual({
      value: 'a',
      label: '默认标签',
    });
  });

  it('数字键在对象上按普通属性读取', () => {
    const props: Record<string, PropsValue> = {
      items: { '0': { name: '已有' } },
    };
    applyDefaultPropsToProps(COMPONENT, props, {
      [COMPONENT]: { 'items.0.name': '默认名称' },
    });

    expect((props['items'] as Record<string, PropsValue>)['0']).toEqual({ name: '已有' });
  });

  it('options 不是数组时跳过无法下钻的路径', () => {
    const props = cloneSchemaProps();
    props['options'] = 'not-array';
    applyDefaults(props);

    expect(props['options']).toBe('not-array');
  });

  it('options 不存在时跳过通配路径', () => {
    const props = cloneSchemaProps();
    delete props['options'];
    applyDefaults(props);

    expect(props['options']).toBeUndefined();
  });

  it('默认值使用深拷贝，不污染 defaultPropsMap', () => {
    const props: Record<string, PropsValue> = {};
    applyDefaults(props);

    expect(props['meta']).toEqual({ nested: { count: 1 } });
    (props['meta'] as Record<string, PropsValue>)['nested'] = { count: 2 };
    expect(defaultPropsMap[COMPONENT]!['meta']).toEqual({ nested: { count: 1 } });
  });

  it('defaultPropsMap 无效时不修改 props', () => {
    const props = cloneSchemaProps();
    const before = structuredClone(props);

    applyDefaultPropsToProps(COMPONENT, props, null);
    applyDefaultPropsToProps(COMPONENT, props, undefined);
    applyDefaultPropsToProps(COMPONENT, props, {} as DefaultPropsMap);

    expect(props).toEqual(before);
  });

  it('组件无配置时不修改 props', () => {
    const props = cloneSchemaProps();
    const before = structuredClone(props);

    applyDefaultPropsToProps('OtherComponent', props, defaultPropsMap);

    expect(props).toEqual(before);
  });
});
