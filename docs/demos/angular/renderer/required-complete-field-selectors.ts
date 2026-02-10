import { Component } from '@angular/core';
import { GenuiRenderer } from '@opentiny/genui-sdk-angular';

const content = JSON.stringify({
  componentName: 'Page',
  children: [
    {
      componentName: 'Text',
      props: {
        text: '生成式 UI（Generative UI）是一种创新的交互方式，它能够将大语言模型（LLM）的结构化输出实时渲染为可交互的用户界面。与传统的文本对话不同，生成式 UI 让 AI 能够直接生成表单、按钮、图表等 UI 组件，用户可以通过这些组件与 AI 进行更直观、更高效的交互。',
      },
    },
    {
      componentName: 'div',
      props: {
        style: 'padding: 20px; max-width: 500px;',
      },
      children: '支持传入自定义组件和组件描述，增强生成式UI能力，丰富生成界面。支持自定义交互行为，例如跳转新网页、下载附件等操作。'
    }
  ],
});

@Component({
  imports: [GenuiRenderer],
  template: `
    <button (click)="startStream()">开始渲染</button>
    <div class="container">
      <div>
        <div>默认缓冲字段</div>
        <GenuiRenderer :content="streamContent" :generating="generating"/>
      </div>
      <div>
        <div>自定义缓冲字段: 拦截文本内容</div>
        <GenuiRenderer :content="streamContent" :generating="generating" :requiredCompleteFieldSelectors="requiredCompleteFieldSelectors" />
      </div>
    </div>
  `,
  styles: [
    `
      button {
        padding: 8px 16px;
        background: #1890ff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      .container { 
        display: flex;
        flex-direction: row;
        gap: 10px;
        justify-content: space-between;
      }
      .container > div {
        width: 50%;
      }
    `
  ]
})
export class GenuiExample {
  generating = false;
  requiredCompleteFieldSelectors = [
    '[componentName=Text] > props > text',
  ];
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