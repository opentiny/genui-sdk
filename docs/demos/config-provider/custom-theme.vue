<template>
  <div class="app">
    <ConfigProvider theme="default" id="my-custom-theme">
      <div class="my-custom-theme">
        <GenuiChat :url="url" />
      </div>
    </ConfigProvider>
  </div>
</template>

<script setup lang="ts">
import { ConfigProvider, GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';
</script>

<style scoped>
.my-custom-theme {
  /* 主色调 - 使用紫色系 */
  --genui-primary-color: #8b5cf6;
  --genui-primary-hover: #7c3aed;
  --genui-primary-active: #6d28d9;
  --genui-primary-light: #ede9fe;
  
  /* 成功色 */
  --genui-success-color: #10b981;
  --genui-success-light: #d1fae5;
  
  /* 警告色 */
  --genui-warning-color: #f59e0b;
  --genui-warning-light: #fef3c7;
  
  /* 错误色 */
  --genui-error-color: #ef4444;
  --genui-error-light: #fee2e2;
  
  /* 信息色 */
  --genui-info-color: #3b82f6;
  --genui-info-light: #dbeafe;
  
  /* 文本颜色 */
  --genui-text-primary: #1e293b;
  --genui-text-secondary: #64748b;
  --genui-text-tertiary: #94a3b8;
  --genui-text-disabled: #cbd5e1;
  --genui-text-inverse: #ffffff;
  
  /* 背景颜色 */
  --genui-bg-primary: #ffffff;
  --genui-bg-secondary: #f8fafc;
  --genui-bg-tertiary: #f1f5f9;
  --genui-bg-hover: #f8fafc;
  --genui-bg-active: #f1f5f9;
  
  /* 边框颜色 */
  --genui-border-color: #e2e8f0;
  --genui-border-hover: #cbd5e1;
  --genui-border-active: #8b5cf6;
  --genui-border-disabled: #e2e8f0;
  
  /* 圆角 */
  --genui-border-radius-sm: 6px;
  --genui-border-radius-md: 8px;
  --genui-border-radius-lg: 12px;
  --genui-border-radius-xl: 16px;
  --genui-border-radius-full: 9999px;
  
  /* 阴影 */
  --genui-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --genui-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --genui-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --genui-shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  
  /* 间距 */
  --genui-spacing-xs: 4px;
  --genui-spacing-sm: 8px;
  --genui-spacing-md: 16px;
  --genui-spacing-lg: 24px;
  --genui-spacing-xl: 32px;
  --genui-spacing-2xl: 48px;
  
  /* 字体 */
  --genui-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --genui-font-size-xs: 12px;
  --genui-font-size-sm: 14px;
  --genui-font-size-md: 16px;
  --genui-font-size-lg: 18px;
  --genui-font-size-xl: 20px;
  --genui-font-size-2xl: 24px;
  
  /* 行高 */
  --genui-line-height-tight: 1.25;
  --genui-line-height-normal: 1.5;
  --genui-line-height-relaxed: 1.75;
  
  /* 过渡动画 */
  --genui-transition-fast: 150ms;
  --genui-transition-base: 200ms;
  --genui-transition-slow: 300ms;
  --genui-transition-timing: cubic-bezier(0.4, 0, 0.2, 1);
}
</style>

