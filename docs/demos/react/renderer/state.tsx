import { useEffect, useRef } from 'react';
import { GenuiConfigProvider, GenuiRenderer, type IRendererExpose } from '@opentiny/genui-sdk-react';
import { materials } from '@opentiny/genui-sdk-materials-react-antd/materials';

const generating = false;

const content = {
  componentName: 'Page',
  state: {
    formData: {
      name: '',
      age: null,
    },
  },
  children: [
    {
      componentName: 'AntForm',
      props: {
        layout: 'vertical',
        style: { maxWidth: 480 },
      },
      children: [
        {
          componentName: 'AntFormItem',
          props: {
            label: '姓名',
          },
          children: [
            {
              componentName: 'AntInput',
              props: {
                placeholder: '请输入姓名',
                value: {
                  type: 'JSExpression',
                  value: 'this.state.formData.name',
                },
                onChange: {
                  type: 'JSFunction',
                  value: 'function(e) { this.state.formData.name = e.target.value; }',
                },
              },
            },
          ],
        },
        {
          componentName: 'AntFormItem',
          props: {
            label: '年龄',
          },
          children: [
            {
              componentName: 'AntInput',
              props: {
                placeholder: '请输入年龄',
                value: {
                  type: 'JSExpression',
                  value: 'this.state.formData.age',
                },
                onChange: {
                  type: 'JSFunction',
                  value: 'function(e) { this.state.formData.age = e.target.value; }',
                },
              },
            },
          ],
        },
        {
          componentName: 'AntFormItem',
          props: {},
          children: [
            {
              componentName: 'AntButton',
              props: {
                type: 'primary',
                onClick: {
                  type: 'JSFunction',
                  value: "function() { this.callAction('getState'); }",
                },
              },
              children: [
                {
                  componentName: 'Text',
                  props: {
                    text: '查看状态',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const historyState = {
  formData: {
    name: 'John Doe',
    age: 30,
  },
};

const customActions = {
  getState: {
    execute: (_params: unknown, context: Record<string, unknown>) => {
      alert(`历史状态:\n${JSON.stringify(context.state, null, 2)}`);
    },
  },
};

export default function Demo() {
  const rendererRef = useRef<IRendererExpose | null>(null);

  // 挂载完成后注入历史状态；若卡片仍在流式更新，schema 变化会重置状态，需在更新后重新调用
  useEffect(() => {
    rendererRef.current?.setState(historyState);
  }, []);

  return (
    <GenuiConfigProvider materials={materials}>
      <GenuiRenderer
        ref={rendererRef}
        content={content}
        generating={generating}
        customActions={customActions}
        isJsonComplete
      />
    </GenuiConfigProvider>
  );
}
