# 使用 Renderer 组件

本节展示一个**最小可用示例**：使用浏览器原生 `fetch` 发起 **流式请求**，然后把流式返回的 schema 片段交给 `SchemaRenderer` 渲染即可。

不引入对话框组件、模型 SDK，只保留三件事：

- **发请求**：用 `fetch` 调你的后端接口
- **读流**：逐块读取响应体
- **喂 Renderer**：把解析出来的 schema 赋值给 `SchemaRenderer` 的 `content` 属性

## 后端返回约定（示例）

这里假设你的后端以 **SSE 风格** 持续返回数据，每一行形如：

- **`data: {"schema": {...}}`**：包含一份完整或增量的 schema
- **`data: [DONE]`**：表示生成结束

伪代码示例（Node.js，仅作为协议说明，可以按需调整）：

```ts
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');

// 生成过程中不断推送 schema（可以是全量，也可以是增量）
const schema = { componentName: 'Page', children: [] };
res.write(`data: ${JSON.stringify({ schema })}\n\n`);

// 结束标记
res.write('data: [DONE]\n\n');
res.end();
```

只要你保证前端能从每一条 `data: xxx` 中解析出一个 schema，就可以直接喂给 `SchemaRenderer`。

## 使用 fetch + Renderer 的完整前端示例

下面是一个最简 Vue 单文件组件示例：

- 点击按钮后，使用 `fetch` 调用后端 `/api/schema-stream`
- 逐行读取 `data: ...`，解析出 `schema`
- 把最新的 `schema` 赋值给 `SchemaRenderer` 的 `content`

```vue
<template>
  <div style="display: flex; gap: 16px">
    <button :disabled="loading" @click="startGenerate">
      {{ loading ? '生成中...' : '生成页面' }}
    </button>

    <!-- 直接使用 SchemaRenderer 渲染 schema -->
    <SchemaRenderer :content="schema" :generating="loading" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { SchemaRenderer } from '@opentiny/genui-sdk-vue';

// 当前 schema
const schema = ref<any>({
  componentName: 'Page',
  children: [],
});

const loading = ref(false);

// 使用 fetch + ReadableStream 读取后端流
const startGenerate = async () => {
  if (loading.value) return;
  loading.value = true;

  try {
    const response = await fetch('/api/schema-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // 这里可以传你自己的 prompt / 参数
        prompt: '帮我生成一个包含查询表单和结果表格的页面 schema',
        stream: true,
      }),
    });

    if (!response.body) {
      throw new Error('ReadableStream 不可用');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // 按行拆分（SSE 一般以 \n 分割）
      while (true) {
        const lineEndIndex = buffer.indexOf('\n');
        if (lineEndIndex === -1) break;

        const line = buffer.slice(0, lineEndIndex).trim();
        buffer = buffer.slice(lineEndIndex + 1);

        if (!line.startsWith('data: ')) continue;
        const dataStr = line.slice(6); // 去掉 "data: "

        if (dataStr === '[DONE]') {
          // 生成结束
          break;
        }

        try {
          const payload = JSON.parse(dataStr);
          if (payload.schema) {
            // 这里直接把最新的 schema 喂给 Renderer
            schema.value = payload.schema;
          }
        } catch (e) {
          console.error('解析后端数据失败:', e, dataStr);
        }
      }
    }
  } catch (err) {
    console.error('请求失败:', err);
  } finally {
    loading.value = false;
  }
};
</script>
```

## 接下来可以做什么？

- **接入真实大模型**：把 `/api/schema-stream` 换成你自己的大模型中转服务
- **结合 requiredCompleteFieldSelectors**：需要更稳的流式渲染时，可以配合字段完整性控制一起用
- **拆分 UI**：把按钮、表单、渲染区域拆成独立组件，但核心仍然是「流式 fetch → 更新 schema → 交给 `SchemaRenderer`」

