import { Component } from '@angular/core';
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-angular';
import { materials } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/materials';

@Component({
  imports: [GenuiConfigProvider, GenuiRenderer],
  template: `
    <genui-config-provider [materials]="activeMaterials">
      <genui-renderer [content]="schemaContent" [customActions]="customActions" [state]="historyState">  </genui-renderer>
    </genui-config-provider>
  `,
})
export class GenuiExample {
  activeMaterials = materials;
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
        componentName: 'div',
        props: {
          style: 'padding: 20px; max-width: 500px;',
        },
        children: [
          {
            componentName: 'div',
            props: {
              style: 'display: flex; flex-direction: column; gap: 8px;'
            },
            children: [
              {
                componentName: 'label',
                props: {
                  style: 'font-weight: bold;'
                },
                children: '姓名'
              },
              {
                componentName: 'TiText',
                props: {
                  placeholder: '请输入姓名',
                  ngModel: {
                    type: 'JSExpression',
                    model: true,
                    value: 'this.state.formData.name'
                  }
                },
              },
            ]
          },
          {
            componentName: 'div',
            props: {
              style: 'display: flex; flex-direction: column; gap: 8px;'
            },
            children: [
              {
                componentName: 'label',
                props: {
                  style: 'font-weight: bold;'
                },
                children: '年龄'
              },
              {
                componentName: 'TiText',
                props: {
                  placeholder: '请输入年龄',
                  ngModel: {
                    type: 'JSExpression',
                    model: true,
                    value: 'this.state.formData.age'
                  }
                }
              }
            ]
          }
        ]
      },
      {
        componentName: 'TiButton',
        props: {
          onClick: {
            type: 'JSFunction',
            value: 'function() { this.callAction(\'getState\'); }',
          },
        },
        children: '查看状态'
      }
    ]
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
