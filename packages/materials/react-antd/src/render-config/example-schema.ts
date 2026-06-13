import type { CardSchema, IExample } from '@opentiny/genui-sdk-core';

export const antdFormExample = {
  state: {
    formData: { name: '', email: '', department: '' },
  },
  methods: {
    handleSubmit: {
      type: 'JSFunction',
      value:
        "function() { var data = this.state.formData; console.log('submit', data); alert('Submitted:\\n' + JSON.stringify(data, null, 2)); }",
    },
  },
  componentName: 'Page',
  props: { style: 'max-width: 480px; padding: 16px;' },
  children: [
    {
      componentName: 'AntCard',
      props: { title: 'Contact form (Ant Design)' },
      children: [
        {
          componentName: 'AntForm',
          props: { layout: 'vertical' },
          children: [
            {
              componentName: 'AntFormItem',
              props: { label: 'Name' },
              children: [
                {
                  componentName: 'AntInput',
                  props: {
                    placeholder: 'Your name',
                    modelValue: {
                      type: 'JSExpression',
                      model: true,
                      value: 'this.state.formData.name',
                    },
                  },
                },
              ],
            },
            {
              componentName: 'AntFormItem',
              props: { label: 'Email' },
              children: [
                {
                  componentName: 'AntInput',
                  props: {
                    type: 'email',
                    placeholder: 'email@example.com',
                    modelValue: {
                      type: 'JSExpression',
                      model: true,
                      value: 'this.state.formData.email',
                    },
                  },
                },
              ],
            },
            {
              componentName: 'AntFormItem',
              props: { label: 'Department' },
              children: [
                {
                  componentName: 'AntSelect',
                  props: {
                    placeholder: 'Select department',
                    options: [
                      { label: 'Engineering', value: 'eng' },
                      { label: 'HR', value: 'hr' },
                      { label: 'Sales', value: 'sales' },
                    ],
                    value: {
                      type: 'JSExpression',
                      model: true,
                      value: 'this.state.formData.department',
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
                      value: 'function() { this.handleSubmit(); }',
                    },
                  },
                  children: [{ componentName: 'Text', props: { text: 'Submit' } }],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} satisfies CardSchema;

export const antdExamples: IExample[] = [
  {
    name: 'Ant Design form',
    description: 'Form built with AntForm, AntFormItem, AntInput, AntSelect, AntButton',
    schema: antdFormExample,
  },
];
