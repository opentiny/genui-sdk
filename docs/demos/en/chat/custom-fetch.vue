<template>
  <GenuiConfigProvider :materials="materials">
    <GenuiChat :url="url" :customFetch="customFetch" />
  </GenuiConfigProvider>
</template>

<script setup lang="ts">
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
import { GenuiConfigProvider, GenuiChat } from '@opentiny/genui-sdk-vue';
import type { CustomFetch } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';

const customFetch: CustomFetch = async (url, options) => {
  // 1. Add authentication
  const token = localStorage.getItem('authToken');
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
    'X-Request-ID': generateRequestId(),
  };

  // 2. Add request logging
  console.log('[GenUI Request]', { url, method: options.method });

  try {
    // 3. Send request
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // 4. Handle error responses
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GenUI Error]', {
        status: response.status,
        error: errorText,
      });

      // If authentication error, try to refresh token
      if (response.status === 401) {
        // Token refresh logic
        alert('Authentication failed, please login again');
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
