<template>
  <div class="thinking-process" v-if="showThinking">
    <div class="thinking-header">
      <div class="thinking-icon-wrapper">
        <span class="thinking-icon">🧠</span>
      </div>
      <div class="thinking-info">
        <div class="thinking-title">AI 思考过程</div>
        <div class="thinking-subtitle">正在分析您的问题...</div>
      </div>
    </div>
    <div class="thinking-content" v-if="thinkingText">
      <div class="thinking-text">{{ thinkingText }}</div>
    </div>
    <div class="thinking-steps" v-if="thinkingSteps.length > 0">
      <div 
        v-for="(step, index) in thinkingSteps" 
        :key="index"
        class="thinking-step"
      >
        <div class="step-indicator">
          <div class="step-dot"></div>
          <div class="step-line" v-if="index < thinkingSteps.length - 1"></div>
        </div>
        <div class="step-content">
          <div class="step-title">{{ step.title || `步骤 ${index + 1}` }}</div>
          <div class="step-detail" v-if="step.content">{{ step.content }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BubbleProps } from '@opentiny/tiny-robot';
import { computed } from 'vue';

const props = defineProps<BubbleProps>();

const showThinking = computed(() => {
  return !!props.bubble?.thinking || 
         !!props.bubble?.metadata?.thinking ||
         (props.bubble?.generating && props.bubble?.role === 'assistant');
});

const thinkingText = computed(() => {
  const thinking = props.bubble?.thinking || props.bubble?.metadata?.thinking;
  if (typeof thinking === 'string') {
    return thinking;
  }
  return null;
});

const thinkingSteps = computed(() => {
  const thinking = props.bubble?.thinking || props.bubble?.metadata?.thinking;
  if (Array.isArray(thinking)) {
    return thinking;
  }
  if (typeof thinking === 'object' && thinking !== null) {
    return [thinking];
  }
  return [];
});
</script>

<style scoped>
.thinking-process {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 12px;
  margin: 12px 0;
  border: 1px solid #e9ecef;
}

.thinking-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.thinking-icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.thinking-icon {
  font-size: 20px;
}

.thinking-info {
  flex: 1;
}

.thinking-title {
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.thinking-subtitle {
  font-size: 12px;
  color: #666;
}

.thinking-content {
  margin-bottom: 16px;
}

.thinking-text {
  padding: 12px;
  background: white;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.6;
  color: #333;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.thinking-steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.thinking-step {
  display: flex;
  gap: 12px;
}

.step-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}

.step-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #667eea;
  border: 2px solid white;
  box-shadow: 0 0 0 2px #667eea;
}

.step-line {
  width: 2px;
  flex: 1;
  background: #e0e0e0;
  margin-top: 4px;
}

.step-content {
  flex: 1;
  padding-bottom: 12px;
}

.step-title {
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.step-detail {
  font-size: 12px;
  color: #666;
  line-height: 1.5;
}
</style>

