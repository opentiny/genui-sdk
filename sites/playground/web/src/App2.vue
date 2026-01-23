
<script setup lang="ts">
  import { ref } from 'vue';
  import { GenuiChat, GenuiConfigProvider } from '@opentiny/genui-sdk-vue';
  
  const url = 'http://localhost:3100/chat/completions';
  const model = ref('deepseek-v3.2');
  const temperature = ref(0.7);
  const theme = ref<'dark' | 'lite' | 'default'>('dark');
  </script>
  
  <template>
    <GenuiConfigProvider>
      <GenuiChat :url="url" :model="model" :temperature="temperature">
        <template #empty>
          <div class="empty-text">欢迎使用生成式UI</div>
        </template>
      </GenuiChat>
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
  .empty-text {
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 30px;
  }
  </style>