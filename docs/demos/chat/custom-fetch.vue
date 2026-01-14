<template>
  <GenuiChat
    :url="url"
    :customFetch="advancedFetch"
  />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';

const advancedFetch = async (url: string, options: RequestInit) => {
  // 1. 添加认证
  const token = localStorage.getItem('authToken');
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
    'X-Request-ID': generateRequestId(),
  };

  // 2. 添加请求日志
  console.log('[GenUI Request]', { url, method: options.method });

  try {
    // 3. 发送请求
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // 4. 处理错误响应
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GenUI Error]', {
        status: response.status,
        error: errorText,
      });
      
      // 如果是认证错误，可以尝试刷新 token
      if (response.status === 401) {
        // 刷新 token 逻辑
      }
    }

    return response;
  } catch (error) {
    console.error('[GenUI Request Error]', error);
    throw error;
  }
};

function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
</script>

