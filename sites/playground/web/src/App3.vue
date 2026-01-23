<script setup lang="ts">
    import { ref } from 'vue';
    import { GenuiChat, GenuiConfigProvider } from '@opentiny/genui-sdk-vue';
    
    const url = 'https://your-chat-backend/api';
    const model = ref('deepseek-v3.2');
    const temperature = ref(0.7);
    const theme = ref<'dark' | 'lite' | 'default'>('dark');
    </script>
    
    <template>
      <GenuiConfigProvider :theme="theme">
        <GenuiChat :url="url" :model="model" :temperature="temperature" />
      </GenuiConfigProvider>
    </template>
    
    <style>
    body,
    html {
      padding: 0;
      margin: 0;
    }
    #app {
      position: fixed;
      width: 100vw;
      height: 100vh;
    }
    .tiny-config-provider {
      height: 100%;
    }
    </style>