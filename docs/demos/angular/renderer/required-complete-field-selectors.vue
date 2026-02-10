<template>
    <button @click="startStream">开始流式输出</button>
    <GenuiRenderer :content="streamContent" :generating="generating"/>
  </template>
  
  <script setup lang="ts">
  import { ref } from 'vue';
  import GenuiRenderer from './adapter.vue';
  
  const generating = ref(false);

  const streamContent = ref('');

  const content = JSON.stringify({
    componentName: 'Page',
    children: [
      {
        componentName: 'Text',
        props: {
          onClick: {
            type: 'JSFunction',
            value: 'function() { this.callAction(\'showNotification\', { message: \'用户点击了文本\'})}'
          }
        },
        children: '生成式 UI（Generative UI）是一种创新的交互方式，它能够将大语言模型（LLM）的结构化输出实时渲染为可交互的用户界面。与传统的文本对话不同，生成式 UI 让 AI 能够直接生成表单、按钮、图表等 UI 组件，用户可以通过这些组件与 AI 进行更直观、更高效的交互。'
      },
    ],
  });
  // 字符串切割成多个字符串，每个字符串10个字符左右， 并定时追加给streamContent
  const splitContentAndAssignToStream = (content: string) => {
    streamContent.value = '';
    const fragments = content.match(/.{1,10}/g);
    fragments?.forEach((fragment, index) => {
      setTimeout(() => {
        streamContent.value += fragment;
      }, index * 20);
    });
  };

  function startStream() {
    splitContentAndAssignToStream(content);
  }
  
  </script>
  