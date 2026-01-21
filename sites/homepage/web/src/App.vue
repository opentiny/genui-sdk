<script setup lang="ts">
import { ConfigProvider } from '@opentiny/vue'
import designSmbConfig from '@opentiny/vue-design-smb'
import hljs from 'highlight.js/lib/core'
// 示例中代码高亮
import javascript from 'highlight.js/lib/languages/javascript'
import css from 'highlight.js/lib/languages/css'
import html from 'highlight.js/lib/languages/xml'
import json from 'highlight.js/lib/languages/json'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('css', css)
hljs.registerLanguage('html', html)
hljs.registerLanguage('json', json)
</script>

<template>
  <config-provider :config="designSmbConfig">
    <router-view />
  </config-provider>
</template>

<style>
div, section {
  box-sizing: border-box;
}
</style>
