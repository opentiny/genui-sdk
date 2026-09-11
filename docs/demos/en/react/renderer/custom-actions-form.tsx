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
                  value: "function() { this.callAction('showNotification', { title: 'Form content' }); }",
                },
              },
              children: [
                {
                  componentName: 'Text',
                  props: {
                    text: 'Show form content',
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
    description: 'Show a notification with the current form content',
    execute: (params: { title: string }, context: Record<string, unknown>) => {
      const message = JSON.stringify(context.state);
      alert(`${params.title}: ${message}`);
    },
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Notification title',
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
