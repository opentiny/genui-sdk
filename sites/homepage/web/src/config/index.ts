export const guideCodeMap = {
  step1: `
<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';
</script>

<template>
  <GenuiChat />
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
  `,
  step2: `
<script setup lang="ts">
import { ref } from 'vue'; 
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api'; 
const model = ref('deepseek-v3.2'); 
const temperature = ref(0.7); 
</script>

<template>
  <GenuiChat :url="url" :model="model" :temperature="temperature" />  
</template>
  `,
  step3: `
<script setup lang="ts">
import { ref } from 'vue';
import { GenuiChat, ConfigProvider } from '@opentiny/genui-sdk-vue'; 

const url = 'https://your-chat-backend/api';
const model = ref('deepseek-v3.2');
const temperature = ref(0.7);
</script>

<template>
  <ConfigProvider theme="dark">
    <GenuiChat :url="url" :model="model" :temperature="temperature" />
  </ConfigProvider>
</template>
  `
}
