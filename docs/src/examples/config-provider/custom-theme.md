# ConfigProvider 组件 - 自定义主题

除了内置的主题，`ConfigProvider` 还支持自定义主题，允许你完全控制组件的样式。

## 基础用法

自定义主题主要通过 CSS 变量来实现。你可以在 `ConfigProvider` 包裹的容器中定义自定义的 CSS 变量。

```vue
<template>
  <ConfigProvider theme="default" id="custom-theme">
    <div class="custom-theme-wrapper">
      <GenuiChat :url="url" />
    </div>
  </ConfigProvider>
</template>

<script setup lang="ts">
import { ConfigProvider, GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';
</script>

<style scoped>
.custom-theme-wrapper {
  /* 自定义 CSS 变量 */
  --genui-primary-color: #1890ff;
  --genui-success-color: #52c41a;
  --genui-warning-color: #faad14;
  --genui-error-color: #f5222d;
  --genui-text-color: #333;
  --genui-bg-color: #fff;
  --genui-border-color: #d9d9d9;
  --genui-border-radius: 4px;
}
</style>
```

## 自定义颜色主题

```vue
<template>
  <ConfigProvider theme="default" id="colorful-theme">
    <div class="colorful-theme">
      <GenuiChat :url="url" />
    </div>
  </ConfigProvider>
</template>

<script setup lang="ts">
import { ConfigProvider, GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';
</script>

<style scoped>
.colorful-theme {
  /* 主色调 */
  --genui-primary-color: #6366f1;
  --genui-primary-hover: #4f46e5;
  --genui-primary-active: #4338ca;
  
  /* 成功色 */
  --genui-success-color: #10b981;
  --genui-success-hover: #059669;
  
  /* 警告色 */
  --genui-warning-color: #f59e0b;
  --genui-warning-hover: #d97706;
  
  /* 错误色 */
  --genui-error-color: #ef4444;
  --genui-error-hover: #dc2626;
  
  /* 文本颜色 */
  --genui-text-primary: #1f2937;
  --genui-text-secondary: #6b7280;
  --genui-text-disabled: #9ca3af;
  
  /* 背景颜色 */
  --genui-bg-primary: #ffffff;
  --genui-bg-secondary: #f9fafb;
  --genui-bg-tertiary: #f3f4f6;
  
  /* 边框颜色 */
  --genui-border-color: #e5e7eb;
  --genui-border-hover: #d1d5db;
}
</style>
```

## 自定义深色主题

```vue
<template>
  <ConfigProvider theme="dark" id="custom-dark-theme">
    <div class="custom-dark-theme">
      <GenuiChat :url="url" />
    </div>
  </ConfigProvider>
</template>

<script setup lang="ts">
import { ConfigProvider, GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';
</script>

<style scoped>
.custom-dark-theme {
  /* 深色主题配色 */
  --genui-primary-color: #60a5fa;
  --genui-primary-hover: #3b82f6;
  
  /* 文本颜色 */
  --genui-text-primary: #f9fafb;
  --genui-text-secondary: #d1d5db;
  --genui-text-disabled: #9ca3af;
  
  /* 背景颜色 */
  --genui-bg-primary: #1f2937;
  --genui-bg-secondary: #111827;
  --genui-bg-tertiary: #374151;
  
  /* 边框颜色 */
  --genui-border-color: #4b5563;
  --genui-border-hover: #6b7280;
}
</style>
```

## 自定义圆角和间距

```vue
<template>
  <ConfigProvider theme="default" id="rounded-theme">
    <div class="rounded-theme">
      <GenuiChat :url="url" />
    </div>
  </ConfigProvider>
</template>

<script setup lang="ts">
import { ConfigProvider, GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';
</script>

<style scoped>
.rounded-theme {
  /* 圆角 */
  --genui-border-radius-sm: 4px;
  --genui-border-radius-md: 8px;
  --genui-border-radius-lg: 12px;
  --genui-border-radius-xl: 16px;
  
  /* 间距 */
  --genui-spacing-xs: 4px;
  --genui-spacing-sm: 8px;
  --genui-spacing-md: 16px;
  --genui-spacing-lg: 24px;
  --genui-spacing-xl: 32px;
  
  /* 字体大小 */
  --genui-font-size-sm: 12px;
  --genui-font-size-md: 14px;
  --genui-font-size-lg: 16px;
  --genui-font-size-xl: 18px;
}
</style>
```

## 完整自定义主题示例

<demo vue="../../../demos/config-provider/custom-theme.vue" />

## 动态切换自定义主题

```vue
<template>
  <div class="app">
    <div class="theme-selector">
      <button 
        v-for="theme in themes" 
        :key="theme.name"
        @click="currentTheme = theme"
        :class="{ active: currentTheme.name === theme.name }"
      >
        {{ theme.name }}
      </button>
    </div>
    
    <ConfigProvider theme="default" id="dynamic-theme">
      <div :class="currentTheme.class">
        <GenuiChat :url="url" />
      </div>
    </ConfigProvider>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ConfigProvider, GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';

const themes = [
  { name: '默认', class: 'theme-default' },
  { name: '紫色', class: 'theme-purple' },
  { name: '蓝色', class: 'theme-blue' },
  { name: '绿色', class: 'theme-green' },
];

const currentTheme = ref(themes[0]);
</script>

<style scoped>
.theme-selector {
  padding: 16px;
  display: flex;
  gap: 8px;
}

.theme-selector button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
}

.theme-selector button.active {
  background: #1890ff;
  color: white;
}

.theme-purple {
  --genui-primary-color: #8b5cf6;
}

.theme-blue {
  --genui-primary-color: #3b82f6;
}

.theme-green {
  --genui-primary-color: #10b981;
}
</style>
```

## 注意事项

1. **CSS 变量作用域**：确保 CSS 变量定义在 `ConfigProvider` 包裹的容器内
2. **变量命名**：使用 `--genui-` 前缀避免与其他样式冲突
3. **主题兼容性**：自定义主题应该与内置主题保持兼容
4. **响应式设计**：考虑在不同屏幕尺寸下的主题表现
5. **性能考虑**：避免在主题中定义过多的 CSS 变量
