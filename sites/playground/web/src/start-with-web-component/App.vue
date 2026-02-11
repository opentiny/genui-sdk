<template>
  <div class="demo-container">
    <div class="input-group">
      <input v-model="inputText" placeholder="请输入问题..." @keyup.enter="handleSend" />
      <button @click="handleSend">发送</button>
    </div>
    <genui-renderer :content="schema" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { fetchSchemaStream } from './fetch-schema-stream';
import '../../../../../packages/frameworks/vue/output/web-component/genui-renderer.js';

const inputText = ref('');
const schema = ref<any>({ componentName: 'Page', children: [] });
const generating = ref(false);

const handleSend = async () => {
  if (!inputText.value.trim() || generating.value) return;

  generating.value = true;
  schema.value = '';
  const userInput = inputText.value;
  inputText.value = '';

  try {
    await fetchSchemaStream('http://localhost:3100/chat/completions', userInput, (schemaChunk) => {
      schema.value += schemaChunk;
    });
  } catch (error) {
    console.error('请求失败:', error);
  } finally {
    generating.value = false;
  }
};
</script>

<style scoped>
.demo-container {
  padding: 16px;
  box-sizing: border-box;
}

.input-group {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
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
