<script setup lang="ts">
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import css from 'highlight.js/lib/languages/css';
import html from 'highlight.js/lib/languages/xml';
import json from 'highlight.js/lib/languages/json';
import './reset.css';
import Home from './views/home.vue';
import LanguageSwitcher from './components/LanguageSwitcher.vue';
import { locale } from './i18n';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('css', css);
hljs.registerLanguage('html', html);
hljs.registerLanguage('json', json);
</script>

<template>
  <LanguageSwitcher />
  <Home :key="locale" />
</template>

<style>
div,
section {
  box-sizing: border-box;
}
</style>
