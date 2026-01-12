import { matchJsonPath } from '../json-path';
import { expect, test } from 'vitest';

const json = {
  'componentName': 'Page',
  'fileName': 'Untitleda',
  'css':
    '.page-base-style {\n  padding: 24px;background: #FFFFFF;\n}\n\n.block-base-style {\n  margin: 16px;\n}\n\n.component-base-style {\n  margin: 8px;\n}\n',
  'props': {
    'className': 'page-base-style',
  },
  'lifeCycles': {},
  'children': [
    {
      'componentName': 'CanvasFlexBox',
      'id': 'e9a7b6c5',
      'props': {
        'flexDirection': 'column',
        'justifyContent': 'center',
        'alignItems': 'center',
      },
      'children': [
        {
          'componentName': 'Text',
          'id': 'f2g3h4i5',
          'props': {
            'text': '降本增效，加速企业数字化转型',
            'style': 'font-size: 24px; font-weight: bold; margin-bottom: 20px;',
          },
        },
        {
          'componentName': 'TinyTabs',
          'id': 'j6k7l8m9',
          'props': {
            'modelValue': '精选推荐',
            'className': 'component-base-style',
          },
        },
      ],
    },
  ],
};

test('是否相同属性', () => {
  expect(matchJsonPath(json, 'componentName', 'fileName')).toBe(false);
  expect(matchJsonPath(json, 'componentName', 'componentName')).toBe(true);
});

test('祖先选择器', () => {
  expect(matchJsonPath(json, '[componentName=Page] modelValue', 'children.0.children.1.props.modelValue')).toBe(true);
  expect(matchJsonPath(json, '[componentName=TinyTabs]  modelValue', 'children.0.children.1.props.modelValue')).toBe(
    true,
  );
  expect(
    matchJsonPath(json, '[className=component-base-style]  modelValue', 'children.0.children.1.props.modelValue'),
  ).toBe(false);
});

test('父选择器', () => {
  expect(matchJsonPath(json, '[componentName=Page] > modelValue', 'children.0.children.1.props.modelValue')).toBe(
    false,
  );
  expect(matchJsonPath(json, '[componentName=TinyTabs] > modelValue', 'children.0.children.1.props.modelValue')).toBe(
    true,
  );
});

test('同层级选择器', () => {
  expect(matchJsonPath(json, '[className=invalid-classname]modelValue', 'children.0.children.1.props.modelValue')).toBe(
    false,
  );
  expect(
    matchJsonPath(json, '[className=component-base-style]modelValue', 'children.0.children.1.props.modelValue'),
  ).toBe(true);
});

test('多祖先选择器加前置匹配', () => {
  expect(
    matchJsonPath(
      json,
      '[componentName=Page] [componentName=CanvasFlexBox][id^=e9a] [componentName=TinyTabs] > modelValue',
      'children.0.children.1.props.modelValue',
    ),
  ).toBe(true);
});

// test('连续的子选择器', () => {
//   expect(matchJsonPath(json, '[componentName=Page] > > > > modelValue', 'children.0.children.1.props.modelValue')).toBe(
//     true,
//   );

//   expect(matchJsonPath(json, '> > > > modelValue', 'children.0.children.1.props.modelValue')).toBe(false);
// });
