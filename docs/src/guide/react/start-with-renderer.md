# 使用 Renderer 组件

核心渲染器 Renderer 组件（`GenuiRenderer`），可以使用其进行更自由的逻辑组合、更精密流程控制。本节展示一个**最小可用示例**：使用浏览器原生 `fetch` 发起 **流式请求**，然后把流式返回的 schema 片段交给 `GenuiRenderer` 渲染。

## 使用 fetch 请求服务，处理流式返回

创建一个文件 `fetch-schema-stream.ts`。基于 OpenAI 兼容 SSE 解析 `delta.content`，再用 core 的 `PatternExtractor` 提取 `` ```schemaJson `` 片段（默认 `SchemaJsonPattern`）：

````ts
// fetch-schema-stream.ts
import { PatternExtractor } from '@opentiny/genui-sdk-core';

export async function fetchSchemaStream(
  url: string,
  userInput: string,
  onSchemaUpdate: (schemaChunk: string) => void,
): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: userInput }],
      model: 'deepseek-v3.2',
      stream: true,
      metadata: {
        tinygenui: JSON.stringify({
          framework: 'React',
        }),
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  const patternExtractor = new PatternExtractor({
    onNormalWrite: () => {},
    onHandledWrite: (value) => onSchemaUpdate(value),
  });

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      while (true) {
        const lineEndIndex = buffer.indexOf('\n');
        if (lineEndIndex === -1) break;

        const line = buffer.slice(0, lineEndIndex).trim();
        buffer = buffer.slice(lineEndIndex + 1);

        if (!line.startsWith('data: ')) continue;

        const dataStr = line.slice(6);

        if (dataStr === '[DONE]') {
          return;
        }

        try {
          const chunk = JSON.parse(dataStr);
          const content = chunk.choices?.[0]?.delta?.content;

          if (!content) continue;

          patternExtractor.handleContent(content);
        } catch (e) {
          console.error('解析后端数据失败:', e, dataStr);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
````

## 使用 Renderer 组件接受流式返回的 schemaJson

创建一个简单的 React 组件，包含输入框、发送按钮和渲染区域，配置一下能够生成 schemaJson 的 LLM 服务：

```tsx
import { useState } from 'react';
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-react';
import { materials } from '@opentiny/genui-sdk-materials-react-antd/materials';
import { fetchSchemaStream } from './fetch-schema-stream';
import 'antd/dist/reset.css';

export function GenuiExample() {
  const [inputText, setInputText] = useState('');
  const [schema, setSchema] = useState('');
  const [generating, setGenerating] = useState(false);

  async function handleSend() {
    if (!inputText.trim() || generating) return;

    setGenerating(true);
    setSchema('');
    const userInput = inputText;
    setInputText('');

    try {
      await fetchSchemaStream('https://<your-backend-api>/chat/completions', userInput, (schemaChunk) => {
        setSchema((prev) => prev + schemaChunk);
      });
    } catch (error) {
      console.error('请求失败:', error);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="demo-container">
      <div className="input-group">
        <input
          value={inputText}
          type="text"
          placeholder="请输入问题..."
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
          }}
        />
        <button onClick={handleSend}>发送</button>
      </div>
      <GenuiConfigProvider materials={materials}>
        <GenuiRenderer content={schema} generating={generating} />
      </GenuiConfigProvider>
    </div>
  );
}
```

对应样式：

```css
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
```

## 其他相关文档

- 查看 [Renderer 组件文档](../../components/react/renderer) 了解详细的 API
- 查看 [安装与配置](install) 了解依赖与物料注入
