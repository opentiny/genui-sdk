## 初始化项目

```bash
npm create vue@latest genui-chat
```

按照默认提示进行项目初始化。

## 安装依赖

```bash
cd genui-chat
npm i @opentiny/genui-sdk-vue@0.0.1-alpha.3 -S
```

## 改造项目

修改`src\main.js`，删除vue初始化工程引入的样式。

```js
- import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
```

修改`src\App.vue`文件

```html
  import { ref } from 'vue';
  import { GenuiChat,ConfigProvider } from '@opentiny/genui-sdk-vue';

  const llmConfig = ref({
    model: 'qwen3-coder-30b-a3b-instruct（推荐）',
    temperature: 0.5,
  });
</script>

<template>
<ConfigProvider theme="dark">
  <GenuiChat url="http://100.94.63.14:3008/chat-ui" :llm-config="llmConfig"/>
</ConfigProvider>
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
```

## 启动项目

运行`npm run dev`后运行项目即可开始体验。

更多组件用法请参考文档：[components用法](./components.md)
