import { Component } from '@angular/core';
import { GenuiRenderer } from '@opentiny/genui-sdk-angular';

const content = JSON.stringify({
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
        style: 'color: red;',
      },
      children: 'Hello World',
    }
  ],
});

@Component({
  imports: [GenuiRenderer],
  template: `
    <button (click="startStream">开始流式输出</button>
    <genui-renderer [content]="schemaContent"> </genui-renderer>
  `,
})
export class GenuiExample {
  generating = false;
  streamContent = '';

  splitContentAndAssignToStream = (content: string) => {
    this.streamContent = '';
    const fragments = content.match(/.{1,10}/g);
    fragments?.forEach((fragment, index) => {
      setTimeout(() => {
        this.streamContent += fragment;
      }, index * 20);
    });
  };

  startStream() {
    splitContentAndAssignToStream(content)
  }
}