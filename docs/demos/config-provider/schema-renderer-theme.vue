<template>
  <div class="app">
    <header class="app-header">
      <h1>SchemaRenderer 主题示例</h1>
      <div class="header-actions">
        <button @click="toggleTheme" class="theme-toggle">
          {{ themeIcon }}
        </button>
      </div>
    </header>

    <ConfigProvider :theme="currentTheme" id="schema-renderer">
      <div class="renderer-container" :style="{ backgroundColor: containerBgColor }">
        <SchemaRenderer :content="content" :generating="generating" />
      </div>
    </ConfigProvider>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ConfigProvider, SchemaRenderer } from '@opentiny/genui-sdk-vue';

const currentTheme = ref<'dark' | 'lite' | 'default'>('default');

const themeIcon = computed(() => {
  const icons = {
    default: '☀️',
    dark: '🌙',
  };
  return icons[currentTheme.value];
});

const containerBgColor = computed(() => {
  return currentTheme.value === 'dark' ? '#191919' : '#fff';
});

function toggleTheme() {
  currentTheme.value = currentTheme.value === 'dark' ? 'default' : 'dark';
}

const generating = ref(false);
const content = ref({
  state: {
    formData: {
      name: '',
      email: '',
    },
  },
  componentName: 'Page',
  children: [
    {
      componentName: 'TinyForm',
      props: {
        model: {
          type: 'JSExpression',
          value: 'this.state.formData',
        },
        'label-position': 'top',
      },
      children: [
        {
          componentName: 'TinyFormItem',
          props: {
            label: '姓名',
            prop: 'name',
          },
          children: [
            {
              componentName: 'TinyInput',
              props: {
                placeholder: '请输入姓名',
                modelValue: {
                  type: 'JSExpression',
                  model: true,
                  value: 'this.state.formData.name',
                },
              },
            },
          ],
        },
        {
          componentName: 'TinyFormItem',
          props: {
            label: '邮箱',
            prop: 'email',
          },
          children: [
            {
              componentName: 'TinyInput',
              props: {
                placeholder: '请输入邮箱',
                modelValue: {
                  type: 'JSExpression',
                  model: true,
                  value: 'this.state.formData.email',
                },
              },
            },
          ],
        },
        {
          componentName: 'TinyFormItem',
          children: [
            {
              componentName: 'TinyButton',
              props: {
                type: 'primary',
                text: '提交',
              },
            },
          ],
        },
      ],
    },
  ],
});
</script>

<style scoped>

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

.renderer-container {
  flex: 1;
  padding: 24px;
  overflow: auto;
}
</style>

