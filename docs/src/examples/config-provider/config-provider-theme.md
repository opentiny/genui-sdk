# ConfigProvider 组件 - 切换主题

`ConfigProvider` 组件支持主题切换功能，可以在运行时动态切换主题。

## 基础用法

```vue
<template>
  <ConfigProvider :theme="currentTheme">
    <GenuiChat :url="url" />
  </ConfigProvider>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ConfigProvider, GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';
const currentTheme = ref<'dark' | 'lite' | 'default'>('default');
</script>
```

## 切换主题

### 使用按钮切换

```vue
<template>
  <div class="app">
    <div class="theme-controls">
      <button @click="setTheme('default')">默认主题</button>
      <button @click="setTheme('dark')">深色主题</button>
      <button @click="setTheme('lite')">浅色主题</button>
    </div>
    
    <ConfigProvider :theme="currentTheme" id="main-provider">
      <GenuiChat :url="url" />
    </ConfigProvider>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ConfigProvider, GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';
const currentTheme = ref<'dark' | 'lite' | 'default'>('default');

function setTheme(theme: 'dark' | 'lite' | 'default') {
  currentTheme.value = theme;
}
</script>

<style scoped>
.theme-controls {
  padding: 16px;
  border-bottom: 1px solid #eee;
  display: flex;
  gap: 8px;
}

.theme-controls button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
}

.theme-controls button:hover {
  background: #f5f5f5;
}
</style>
```

### 使用下拉选择器

```vue
<template>
  <div class="app">
    <div class="theme-selector">
      <label>主题：</label>
      <select v-model="currentTheme">
        <option value="default">默认</option>
        <option value="dark">深色</option>
        <option value="lite">浅色</option>
      </select>
    </div>
    
    <ConfigProvider :theme="currentTheme">
      <GenuiChat :url="url" />
    </ConfigProvider>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ConfigProvider, GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';
const currentTheme = ref<'dark' | 'lite' | 'default'>('default');
</script>

<style scoped>
.theme-selector {
  padding: 16px;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  gap: 8px;
}

.theme-selector select {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
}
</style>
```

## 跟随系统主题

```vue
<template>
  <ConfigProvider :theme="systemTheme">
    <GenuiChat :url="url" />
  </ConfigProvider>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { ConfigProvider, GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';
const systemTheme = ref<'dark' | 'lite' | 'default'>('default');

function updateTheme() {
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    systemTheme.value = 'dark';
  } else {
    systemTheme.value = 'lite';
  }
}

const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

onMounted(() => {
  updateTheme();
  mediaQuery.addEventListener('change', updateTheme);
});

onUnmounted(() => {
  mediaQuery.removeEventListener('change', updateTheme);
});
</script>
```

## 保存主题偏好

```vue
<template>
  <ConfigProvider :theme="savedTheme">
    <GenuiChat :url="url" />
  </ConfigProvider>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { ConfigProvider, GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';
const STORAGE_KEY = 'genui-theme-preference';

const savedTheme = ref<'dark' | 'lite' | 'default'>(() => {
  const saved = localStorage.getItem(STORAGE_KEY);
  return (saved as 'dark' | 'lite' | 'default') || 'default';
});

// 监听主题变化并保存
watch(savedTheme, (newTheme) => {
  localStorage.setItem(STORAGE_KEY, newTheme);
});

// 提供切换方法
function toggleTheme() {
  const themes: ('dark' | 'lite' | 'default')[] = ['default', 'dark', 'lite'];
  const currentIndex = themes.indexOf(savedTheme.value);
  const nextIndex = (currentIndex + 1) % themes.length;
  savedTheme.value = themes[nextIndex];
}
</script>
```

## 完整示例

<demo vue="../../../demos/config-provider/theme.vue" />

## 注意事项

1. **响应式更新**：主题 prop 是响应式的，更改后会立即生效
2. **作用域隔离**：通过 `id` prop 可以为不同的组件实例设置不同的主题
3. **性能考虑**：主题切换是轻量操作，不会影响性能
4. **样式覆盖**：确保自定义样式不会覆盖主题样式
