# Chat 组件 - 自定义思考过程

`GenuiChat` 组件支持自定义思考过程的显示，让用户可以看到 AI 的思考过程。

## 基础用法

通过 `thinkComponent` 可以自定义思考过程的显示组件。

```vue
<template>
  <GenuiChat
    :url="url"
    :thinkComponent="CustomThinkComponent"
    :config="{ showThinkingResult: true }"
  />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';
import CustomThinkComponent from './CustomThinkComponent.vue';

const url = 'https://your-chat-backend/api';
</script>
```

## 创建思考组件

思考组件会接收 `BubbleProps` 作为 props，可以访问思考过程的数据：

```vue
<!-- CustomThinkComponent.vue -->
<template>
  <div class="thinking-process" v-if="thinkingData">
    <div class="thinking-header">
      <span class="thinking-icon">🤔</span>
      <span class="thinking-title">思考过程</span>
    </div>
    <div class="thinking-content">
      <pre>{{ thinkingData }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BubbleProps } from '@opentiny/tiny-robot';
import { computed } from 'vue';

const props = defineProps<BubbleProps>();

const thinkingData = computed(() => {
  // 从 bubble 中获取思考过程数据
  return props.bubble?.thinking || props.bubble?.metadata?.thinking;
});
</script>

<style scoped>
.thinking-process {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  margin: 8px 0;
  border-left: 3px solid #409eff;
}

.thinking-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: 500;
  color: #409eff;
}

.thinking-icon {
  font-size: 18px;
}

.thinking-content {
  background: white;
  padding: 12px;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
}

.thinking-content pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  line-height: 1.5;
  color: #333;
}
</style>
```

## 启用思考过程显示

需要在 `config` 中启用 `showThinkingResult`：

```vue
<template>
  <GenuiChat
    :url="url"
    :thinkComponent="CustomThinkComponent"
    :config="genuiConfig"
  />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';
import CustomThinkComponent from './CustomThinkComponent.vue';

const url = 'https://your-chat-backend/api';

const genuiConfig = {
  showThinkingResult: true  // 启用思考过程显示
};
</script>
```

## 访问思考数据

思考组件可以通过 `BubbleProps` 访问思考过程的相关数据：

```vue
<!-- CustomThinkComponent.vue -->
<template>
  <div class="thinking-process" v-if="hasThinking">
    <div class="thinking-header">
      <span class="thinking-icon">💭</span>
      <span class="thinking-title">AI 思考中...</span>
      <span class="thinking-time">{{ formatTime(thinkingTime) }}</span>
    </div>
    <div class="thinking-steps">
      <div 
        v-for="(step, index) in thinkingSteps" 
        :key="index"
        class="thinking-step"
      >
        <div class="step-number">{{ index + 1 }}</div>
        <div class="step-content">
          <div class="step-title">{{ step.title }}</div>
          <div class="step-detail">{{ step.content }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BubbleProps } from '@opentiny/tiny-robot';
import { computed } from 'vue';

const props = defineProps<BubbleProps>();

const hasThinking = computed(() => {
  return !!props.bubble?.thinking || !!props.bubble?.metadata?.thinking;
});

const thinkingSteps = computed(() => {
  const thinking = props.bubble?.thinking || props.bubble?.metadata?.thinking;
  if (typeof thinking === 'string') {
    try {
      return JSON.parse(thinking);
    } catch {
      return [{ title: '思考', content: thinking }];
    }
  }
  return thinking || [];
});

const thinkingTime = computed(() => {
  return props.bubble?.timestamp || Date.now();
});

function formatTime(timestamp: number) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN');
}
</script>

<style scoped>
.thinking-process {
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  margin: 12px 0;
  color: white;
}

.thinking-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-weight: 600;
}

.thinking-icon {
  font-size: 20px;
}

.thinking-time {
  margin-left: auto;
  font-size: 12px;
  opacity: 0.8;
}

.thinking-steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.thinking-step {
  display: flex;
  gap: 12px;
  background: rgba(255, 255, 255, 0.1);
  padding: 12px;
  border-radius: 8px;
  backdrop-filter: blur(10px);
}

.step-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
}

.step-title {
  font-weight: 600;
  margin-bottom: 4px;
}

.step-detail {
  font-size: 13px;
  opacity: 0.9;
  line-height: 1.5;
}
</style>
```

## 完整示例

<demo vue="../../../demos/chat/thinking-process.vue" />

## 注意事项

1. **启用配置**：需要在 `config.showThinkingResult` 中启用思考过程显示
2. **数据格式**：思考过程的数据格式可能因后端实现而异，需要根据实际情况解析
3. **性能考虑**：思考过程可能会频繁更新，确保组件渲染性能良好
4. **样式设计**：思考过程组件应该清晰易读，帮助用户理解 AI 的思考过程
