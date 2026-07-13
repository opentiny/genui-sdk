<template>
  <div class="app">
    <GenuiConfigProvider theme="light" id="my-custom-theme">
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
    content: 'Generate a button',
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
                    text: 'Primary Button',
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
  /* Custom button Primary theme color - using purple */
  --tv-Button-bg-color-primary: #8b5cf6;
  --tv-Button-border-color-primary: #8b5cf6;
  --tv-Button-text-color-primary: #ffffff;
  --tv-Button-icon-color-primary: #ffffff;
  --tv-Button-bg-color-active-primary: #7c3aed;
  --tv-Button-border-color-active-primary: #7c3aed;
  /* Custom button border radius */
  --tv-Button-border-radius: 16px;
}
#my-custom-theme {
  /* Custom Tiny-Robot theme color */
  --tr-text-primary: #8b5cf6;

  /* Custom Tiny-Robot bubble styles */
  --tr-bubble-content-border-radius: 16px;
  --tr-bubble-content-padding: 20px 28px;
}
</style>
