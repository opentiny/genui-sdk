import { describe, expect, it } from 'vitest';
import { generateCode, ReactCodeGenerator } from './react-code-generator';

describe('ReactCodeGenerator', () => {
  it('generates a compilable TSX component and public panel metadata', async () => {
    const result = await generateCode({
      pageInfo: {
        name: 'OrderForm',
        schema: {
          componentName: 'Page',
          children: [
            {
              componentName: 'AntButton',
              props: { type: 'primary' },
              children: [{ componentName: 'Text', props: { text: 'Submit' } }],
            },
          ],
        },
      },
      componentsMap: [
        { componentName: 'AntButton', package: 'antd', exportName: 'Button' },
        { componentName: 'AntButton', package: 'ignored-package', exportName: 'IgnoredButton' },
      ],
    });

    expect(result.panelName).toBe('OrderForm.tsx');
    expect(result.panelType).toBe('react');
    expect(result.type).toBe('page');
    expect(result.errors).toEqual([]);
    expect(result.panelValue).toContain("import { Button as AntButton } from 'antd'");
    expect(result.panelValue).not.toContain('ignored-package');
    expect(result.panelValue).toContain('export default function OrderForm');
    expect(result.panelValue).toContain('<AntButton type="primary">');
    expect(result.panelValue).toContain('<Text text="Submit" />');
  });

  it('turns schema state mutations and refs into React state updates and ref callbacks', async () => {
    const result = await generateCode({
      pageInfo: {
        schema: {
          componentName: 'Page',
          state: { form: { name: '' } },
          refs: { nameInput: null },
          methods: {
            reset: {
              type: 'JSFunction',
              value: "function reset() { this.state.form.name = ''; this.refs.nameInput?.focus(); }",
            },
          },
          children: [
            {
              componentName: 'AntInput',
              props: {
                ref: { type: 'JSExpression', value: 'this.refs.nameInput' },
                value: { type: 'JSExpression', value: 'this.state.form.name' },
                onChange: {
                  type: 'JSFunction',
                  value: 'function(e) { this.state.form.name = e.target.value; }',
                },
              },
            },
          ],
        },
      },
    });

    expect(result.errors).toEqual([]);
    expect(result.panelValue).toContain("form: { name: '' }");
    expect(result.panelValue).toMatch(
      /setState\(prev => setIn\(prev, \[(?:'|")form(?:'|"), (?:'|")name(?:'|")\], e\.target\.value\)\)/,
    );
    expect(result.panelValue).toContain('ref={(instance) => { refs.nameInput = instance }}');
    expect(result.panelValue).toContain('refs.nameInput?.focus()');
    expect(result.panelValue).not.toContain('this.state');
    expect(result.panelValue).not.toContain('this.refs');
  });

  it('converts update, array mutation, Object.assign and delete operations into immutable updates', async () => {
    const result = await generateCode({
      pageInfo: {
        schema: {
          componentName: 'Page',
          state: { count: 0, items: [], profile: { obsolete: true } },
          methods: {
            update: {
              type: 'JSFunction',
              value:
                "function update() { this.state.count++; this.state.items.push('next'); Object.assign(this.state.profile, { name: 'Ada' }); delete this.state.profile.obsolete; }",
            },
          },
          children: [],
        },
      },
    });

    expect(result.errors).toEqual([]);
    expect(result.panelValue).toContain('setIn(prev, ["count"], prev["count"] + 1)');
    expect(result.panelValue).toContain('setIn(prev, ["items"], [...prev["items"], \'next\'])');
    expect(result.panelValue).toContain('setIn(prev, ["profile"], {');
    expect(result.panelValue).toContain('...prev["profile"]');
    expect(result.panelValue).toContain('setIn(prev, ["profile", "obsolete"], undefined)');
    expect(result.panelValue).not.toContain('this.state');
  });

  it('generates loops, conditions, expression props and render props', async () => {
    const result = await generateCode({
      pageInfo: {
        schema: {
          componentName: 'Page',
          state: { rows: [{ name: 'Ada', visible: true }] },
          children: [
            {
              componentName: 'AntTable',
              props: {
                dataSource: { type: 'JSExpression', value: 'this.state.rows' },
                columns: [
                  {
                    title: 'Name',
                    render: {
                      type: 'JSSlot',
                      params: ['row'],
                      value: [
                        {
                          componentName: 'Text',
                          props: { text: { type: 'JSExpression', value: 'row.name' } },
                        },
                      ],
                    },
                  },
                ],
              },
            },
            {
              componentName: 'div',
              loop: { type: 'JSExpression', value: 'this.state.rows' },
              loopArgs: ['row', 'rowIndex'],
              condition: { type: 'JSExpression', value: 'row.visible' },
              children: [{ componentName: 'Text', props: { text: { type: 'JSExpression', value: 'row.name' } } }],
            },
          ],
        } as any,
      },
    });

    expect(result.errors).toEqual([]);
    expect(result.panelValue).toContain('dataSource={state.rows}');
    expect(result.panelValue).toContain('render: (row) => <Text text={row.name} />');
    expect(result.panelValue).toContain('state.rows.map((row, rowIndex) =>');
    expect(result.panelValue).toContain('row.visible ?');
    expect(result.panelValue).toContain('key={rowIndex}');
  });

  it('generates typed props, lifecycle hooks, scoped CSS and custom actions', async () => {
    const result = await generateCode({
      pageInfo: {
        name: 'profile-card',
        schema: {
          componentName: 'Page',
          props: { style: 'padding: 16px;' },
          schema: {
            properties: [
              {
                content: [
                  { property: 'title', type: 'string', defaultValue: 'Profile' },
                  { property: 'count', type: 'number', defaultValue: 1 },
                ],
              },
            ],
          },
          lifeCycles: {
            onMounted: {
              type: 'JSFunction',
              value: "function() { this.callAction('track', { title: this.props.title }); }",
            },
            onUnmounted: { type: 'JSFunction', value: "function() { console.log('dispose'); }" },
          },
          css: '.card { color: red; }',
          children: [{ componentName: 'div', props: { className: 'card' } }],
        },
      },
    });

    expect(result.errors).toEqual([]);
    expect(result.panelName).toBe('profile-card.tsx');
    expect(result.panelValue).toContain('export interface ProfileCardProps');
    expect(result.panelValue).toContain('title?: string');
    expect(result.panelValue).toContain("title: 'Profile'");
    expect(result.panelValue).toContain('useEffect(() =>');
    expect(result.panelValue).toContain("callAction('track', { title: props.title })");
    expect(result.panelValue).toContain('data-genui-scope="profile-card"');
    expect(result.panelValue).toContain('.card[data-genui-scope=profile-card]');
    expect(result.panelValue.match(/style=\{/g)).toHaveLength(1);
  });

  it('normalizes empty and invalid string schemas without mutating the input', async () => {
    const schema = { componentName: 'Page', state: { count: 1 }, children: [] };
    const original = structuredClone(schema);
    const [empty, invalid, valid] = await Promise.all([
      generateCode({ pageInfo: { schema: '' } }),
      generateCode({ pageInfo: { schema: '{invalid' } }),
      generateCode({ pageInfo: { schema } }),
    ]);

    expect(empty.errors).toEqual([]);
    expect(invalid.errors).toEqual([]);
    expect(valid.errors).toEqual([]);
    expect(schema).toEqual(original);
  });

  it('supports custom formatting options and disabling compile validation', async () => {
    const generator = new ReactCodeGenerator({
      prettierOpts: { printWidth: 80 },
      enableCompileValidation: false,
    });
    const result = await generator.generate({
      pageInfo: { schema: { componentName: 'Page', children: [] } },
      formatWithPrettier: true,
    });

    expect(result.errors).toEqual([]);
    expect(result.prettierOpts).toMatchObject({ parser: 'typescript', printWidth: 80 });
    expect(result.panelValue).toContain('export default function SchemaCard');
  });

  it('formats nested JSX when a material uses a dotted subcomponent export', async () => {
    const result = await generateCode({
      pageInfo: {
        schema: {
          componentName: 'Page',
          children: [
            {
              componentName: 'AntForm',
              children: [
                {
                  componentName: 'AntFormItem',
                  props: { label: 'Name' },
                  children: [{ componentName: 'AntInput' }],
                },
              ],
            },
          ],
        },
      },
      componentsMap: [
        { componentName: 'AntForm', package: 'antd', exportName: 'Form' },
        { componentName: 'AntFormItem', package: 'antd', exportName: 'Form.Item' },
        { componentName: 'AntInput', package: 'antd', exportName: 'Input' },
      ],
      formatWithPrettier: true,
    });

    expect(result.errors).toEqual([]);
    expect(result.panelValue).toContain("import { Form as AntForm, Input as AntInput } from 'antd';");
    expect(result.panelValue).toContain('const AntFormItem = AntForm.Item;');
    expect(result.panelValue).toMatch(/<AntForm>\s+<AntFormItem label="Name">\s+<AntInput \/>/);
    expect(result.panelValue).not.toContain('<AntForm><AntFormItem');
  });
});
