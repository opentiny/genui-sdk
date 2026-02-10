import { Component } from '@angular/core';
import { GenuiRenderer } from '@opentiny/genui-sdk-angular';

@Component({
  imports: [GenuiRenderer],
  template: `
    <genui-renderer [content]="schemaContent" [customActions]="customAction"> </genui-renderer>
  `,
})
export class GenuiExample {
  schemaContent = {
    componentName: 'Page',
    state: {
      formData: {
        name: '',
        age: null,
      },
    },
    children: [
      {
        componentName: 'TiFormField',
        props: {
          style: 'padding: 20px; max-width: 500px;',
        },
        children: [
          {
            componentName: 'TiItem',
            props: {
              label: '姓名',
              prop: 'name',
            },
            children: [
              {
                componentName: 'TiText',
                props: {
                  ngModel: {
                    type: 'JSExpression',
                    model: true,
                    value: 'this.state.formData.name',
                  },
                },
                directives: [
                  {
                    directiveName: 'ngModel',
                  },
                  {
                    directiveName: 'defaultValueAccessor',
                  },
                ],
              },
            ],
          },
          {
            componentName: 'TiItem',
            props: {
              label: '年龄',
              prop: 'age',
            },
            children: [
              {
                componentName: 'TiText',
                props: {
                  ngModel: {
                    type: 'JSExpression',
                    model: true,
                    value: 'this.state.formData.age',
                  },
                },
              },
            ],
          },
        ],
      },
      {
        componentName: 'TiButton',
        props: {
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
  };
  historyState = {
    formData: {
      name: 'John Doe',
      age: 30,
    },
  };
  
  customActions = {
    getState: {
      execute: (params: any, context: Record<string, any>) => {
        const state = context.state;
        alert(`历史状态:\n${JSON.stringify(state, null, 2)}`);
      },
    },
  };
}