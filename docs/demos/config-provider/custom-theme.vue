<template>
  <div class="app">
    <GenuiConfigProvider theme="default" id="my-custom-theme">
      <div class="my-custom-theme">
        <GenuiChat :url="url" model="deepseek-v3.2" :messages="messages" />
      </div>
    </GenuiConfigProvider>
  </div>
</template>

<script setup lang="ts">
import { GenuiConfigProvider, GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';

const messages = [
  {
    role: 'user',
    content: '生成一个按钮',
  },
  {
    role: 'assistant',
    content: '',
    messages: [
      {
        type: 'schema-card',
        content: JSON.stringify({
          componentName: 'Page',
          children: [
            {
              componentName: 'div',
              children: [
                {
                  componentName: 'TinyButton',
                  props: {
                    type: 'primary',
                    text: '主要按钮',
                  },
                },
              ],
            },
          ],
        }),
      },
    ],
  },
];
</script>

<style>
#my-custom-theme .tg-chat-container {
  background-color: #f5f3ff;
}
#my-custom-theme .tiny-button {
  /* 自定义按钮 Primary 主题颜色 - 使用紫色系 */
  --tv-Button-bg-color-primary: #8b5cf6;
  --tv-Button-border-color-primary: #8b5cf6;
  --tv-Button-text-color-primary: #ffffff;
  --tv-Button-icon-color-primary: #ffffff;
  --tv-Button-bg-color-active-primary: #7c3aed;
  --tv-Button-border-color-active-primary: #7c3aed;
  /* 自定义按钮圆角 */
  --tv-Button-border-radius: 16px;
}
#my-custom-theme {
  /* 自定义 Tiny-Robot 主题颜色 */
  --tr-text-primary: #8b5cf6;

  /* 自定义 Tiny-Robot 气泡样式 */
  --tr-bubble-content-border-radius: 16px;
  --tr-bubble-content-padding: 20px 28px;
}
</style>
