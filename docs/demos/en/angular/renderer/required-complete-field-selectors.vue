<template>
    <button @click="startStream">Start Rendering</button>
    <div class="container">
      <div>
        <div>Default buffered fields</div>
        <GenuiRenderer :content="streamContent" :generating="generating"/>
      </div>
      <div>
        <div>Custom buffered fields: intercept text content</div>
        <GenuiRenderer :content="streamContent" :generating="generating" :requiredCompleteFieldSelectors="requiredCompleteFieldSelectors" />
      </div>
    </div>
  </template>

  <script setup lang="ts">
  import { ref } from 'vue';
  import GenuiRenderer from '../../../angular/renderer/adapter.vue';

  const generating = ref(false);

  const requiredCompleteFieldSelectors = [
    '[componentName=Text] > props > text',
  ];

  const streamContent = ref('');

  const content = JSON.stringify({
    componentName: 'Page',
    children: [
      {
        componentName: 'Text',
        props: {
          text: 'Generative UI is an innovative interaction paradigm that renders LLM structured outputs as interactive user interfaces in real time. Unlike traditional text-based chat, Generative UI enables AI to directly generate forms, buttons, charts, and other UI components, allowing users to interact with AI more intuitively and efficiently.',
        },
      },
      {
        componentName: 'div',
        props: {
          style: 'padding: 20px; max-width: 500px;',
        },
        children: 'Supports custom components and component descriptions to enhance generative UI capabilities and enrich generated interfaces. Supports custom interaction behaviors such as navigating to new pages, downloading attachments, and more.'
      }
    ],
  });
  // Split content into fragments and stream them
  const splitContentAndAssignToStream = (content: string) => {
    streamContent.value = '';
    const fragments = content.match(/.{1,5}/g);
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
  <style scoped>
  .container {
    display: flex;
    flex-direction: row;
    gap: 10px;
    justify-content: space-between;
  }
  .container > div {
    width: 50%;
  }
  button {
    padding: 8px 16px;
    background: #1890ff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
</style>
