# Chat 组件 - customFetch

`GenuiChat` 组件支持自定义 fetch 函数，允许你自定义 HTTP 请求的实现方式。

## 为什么需要 customFetch？

默认情况下，`GenuiChat` 使用原生的 `fetch` API 来发送请求。但在某些场景下，你可能需要：

- 添加自定义的请求头
- 实现请求拦截和响应拦截
- 使用其他 HTTP 客户端（如 axios）
- 添加认证逻辑
- 实现请求重试机制

## 基础用法

```vue
<template>
  <GenuiChat
    :url="url"
    :customFetch="customFetch"
  />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';

const customFetch = async (url: string, options: RequestInit) => {
  // 添加自定义请求头
  const customHeaders = {
    ...options.headers,
    'X-Custom-Header': 'custom-value',
    'Authorization': `Bearer ${getToken()}`,
  };

  const response = await fetch(url, {
    ...options,
    headers: customHeaders,
  });

  return response;
};
</script>
```

## 使用 Axios

```vue
<template>
  <GenuiChat
    :url="url"
    :customFetch="axiosFetch"
  />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';
import axios from 'axios';

const url = 'https://your-chat-backend/api';

const axiosFetch = async (url: string, options: RequestInit) => {
  try {
    const response = await axios({
      url,
      method: options.method || 'POST',
      headers: options.headers as any,
      data: options.body,
      signal: options.signal,
      responseType: 'stream', // 对于流式响应
    });

    // 将 axios 响应转换为 fetch Response
    return new Response(response.data, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers as any,
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`HTTP error! status: ${error.response?.status}`);
    }
    throw error;
  }
};
</script>
```

## 添加认证

```vue
<template>
  <GenuiChat
    :url="url"
    :customFetch="authenticatedFetch"
  />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';

function getToken(): string {
  // 从 localStorage、cookie 或其他地方获取 token
  return localStorage.getItem('authToken') || '';
}

function refreshToken(): Promise<string> {
  // 刷新 token 的逻辑
  return fetch('/api/refresh-token')
    .then(res => res.json())
    .then(data => {
      localStorage.setItem('authToken', data.token);
      return data.token;
    });
}

const authenticatedFetch = async (url: string, options: RequestInit) => {
  let token = getToken();

  // 添加认证头
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
  };

  let response = await fetch(url, {
    ...options,
    headers,
  });

  // 如果 token 过期，尝试刷新
  if (response.status === 401) {
    token = await refreshToken();
    headers['Authorization'] = `Bearer ${token}`;
    
    // 重试请求
    response = await fetch(url, {
      ...options,
      headers,
    });
  }

  return response;
};
</script>
```

## 实现请求重试

```vue
<template>
  <GenuiChat
    :url="url"
    :customFetch="retryFetch"
  />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';

const retryFetch = async (
  url: string,
  options: RequestInit,
  retries = 3,
  delay = 1000
): Promise<Response> => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      
      // 如果响应成功，直接返回
      if (response.ok) {
        return response;
      }

      // 如果是最后一次重试，返回响应
      if (i === retries - 1) {
        return response;
      }

      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    } catch (error) {
      // 如果是最后一次重试，抛出错误
      if (i === retries - 1) {
        throw error;
      }

      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }

  throw new Error('Max retries exceeded');
};
</script>
```

## 添加请求日志

```vue
<template>
  <GenuiChat
    :url="url"
    :customFetch="loggedFetch"
  />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';

const loggedFetch = async (url: string, options: RequestInit) => {
  const startTime = Date.now();
  
  console.log('[Request]', {
    url,
    method: options.method || 'GET',
    headers: options.headers,
  });

  try {
    const response = await fetch(url, options);
    const duration = Date.now() - startTime;

    console.log('[Response]', {
      url,
      status: response.status,
      statusText: response.statusText,
      duration: `${duration}ms`,
    });

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error('[Request Error]', {
      url,
      error,
      duration: `${duration}ms`,
    });

    throw error;
  }
};
</script>
```

## 完整示例

<demo vue="../../../demos/chat/custom-fetch.vue" />

## 注意事项

1. **返回类型**：`customFetch` 必须返回一个 `Promise<Response>` 对象
2. **流式响应**：确保自定义 fetch 正确处理流式响应（SSE）
3. **错误处理**：实现适当的错误处理逻辑
4. **性能考虑**：避免在 customFetch 中执行重计算，保持函数轻量
5. **兼容性**：确保自定义实现与原生 fetch API 兼容
