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
    children: [
      {
        componentName: 'TiButton',
        props: {
          onClick: {
            type: 'JSFunction',
            value: "function() { this.callAction('openPage', { url: 'https://opentiny.design/', target: '_blank' }); }",
          },
        },
        children: [
          {
            componentName: 'Text',
            props: {
              text: '打开新页面',
            },
          },
        ],
      },
    ],
  };
  customActions = {
    openPage: {
      name: 'openPage',
      description: '打开新页面',
      execute: (params: any) => {
        const { url, target = '_self' } = params;
        window.open(url, target);
      },
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: '要打开的页面地址',
          },
          target: {
            type: 'string',
            description: '打开方式，可选值：_self（当前窗口）、_blank（新窗口）',
          },
        },
        required: ['url', 'target'],
      },
    },
  };
}
