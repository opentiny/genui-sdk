import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-react';
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
            label: 'Name',
          },
          children: [
            {
              componentName: 'AntInput',
              props: {
                placeholder: 'Enter your name',
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
            label: 'Age',
          },
          children: [
            {
              componentName: 'AntInput',
              props: {
                placeholder: 'Enter your age',
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
                    text: 'View state',
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
      alert(`Restored state:\n${JSON.stringify(context.state, null, 2)}`);
    },
  },
};

export default function Demo() {
  return (
    <GenuiConfigProvider materials={materials}>
      <GenuiRenderer
        content={content}
        generating={generating}
        state={historyState}
        customActions={customActions}
        isJsonComplete
      />
    </GenuiConfigProvider>
  );
}
