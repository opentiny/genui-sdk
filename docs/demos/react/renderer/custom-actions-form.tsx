import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-react';
import { materials } from '@opentiny/genui-sdk-materials-react-antd/materials';

const generating = false;

const content = {
  state: {
    formData: {
      name: '',
      age: '',
    },
  },
  componentName: 'Page',
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
                  value:
                    "function() { this.callAction('showNotification', { title: '表单内容' }); }",
                },
              },
              children: [
                {
                  componentName: 'Text',
                  props: {
                    text: '显示表单内容',
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

const customActions = {
  showNotification: {
    name: 'showNotification',
    description: '显示通知，弹出表单中实时绑定的内容',
    execute: (params: { title: string }, context: Record<string, unknown>) => {
      const message = JSON.stringify(context.state);
      alert(`${params.title}：${message}`);
    },
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: '通知标题',
        },
      },
      required: ['title'],
    },
  },
};

export default function Demo() {
  return (
    <GenuiConfigProvider materials={materials}>
      <GenuiRenderer
        content={content}
        generating={generating}
        customActions={customActions}
        isJsonComplete
      />
    </GenuiConfigProvider>
  );
}
