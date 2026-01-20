<template>
  <div class="app">
    <header class="app-header">
      <h1>GenUI Chat</h1>
      <div class="header-actions">
        <button @click="toggleTheme" class="theme-toggle">
          {{ themeIcon }}
        </button>
      </div>
    </header>

    <GenuiConfigProvider :theme="currentTheme" id="main-chat">
      <GenuiChat :url="url" model="deepseek-v3.2" :messages="messages" />
    </GenuiConfigProvider>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { GenuiConfigProvider, GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';

const messages = [
  {
    role: 'user',
    content: '查询火车票',
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
              componentName: 'TinyCard',
              children: [
                {
                  componentName: 'TinyForm',
                  props: {
                    labelPosition: 'top',
                    labelWidth: '120px',
                  },
                  children: [
                    {
                      componentName: 'TinyFormItem',
                      props: { label: '出发地', prop: 'departure' },
                      children: [
                        {
                          componentName: 'TinyInput',
                          props: { placeholder: '请输入出发地' },
                        },
                      ],
                    },
                    {
                      componentName: 'TinyFormItem',
                      props: { label: '目的地', prop: 'destination' },
                      children: [
                        {
                          componentName: 'TinyInput',
                          props: { placeholder: '请输入目的地' },
                        },
                      ],
                    },
                    {
                      componentName: 'TinyFormItem',
                      props: {},
                      children: [
                        {
                          componentName: 'TinyButton',
                          props: {
                            type: 'primary',
                            text: '提交',
                            onClick: {
                              type: 'JSFunction',
                              value: "function() { this.callAction('continueChat', { message: '提交' }); }",
                            },
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        }),
      },
    ],
  },
];

const currentTheme = ref<'dark' | 'lite' | 'default'>('default');

const themeIcon = computed(() => {
  const icons = {
    default: '☀️',
    dark: '🌙',
  };
  return icons[currentTheme.value];
});

function toggleTheme() {
  currentTheme.value = currentTheme.value === 'dark' ? 'default' : 'dark';
}
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 800px;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.app-header h1 {
  margin: 0;
  font-size: 20px;
}

.theme-toggle {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 20px;
}

.theme-toggle:hover {
  background: #f5f5f5;
}
</style>
