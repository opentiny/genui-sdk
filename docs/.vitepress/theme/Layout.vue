<script setup lang="ts">
import DefaultTheme from 'vitepress/theme';
import { CopyMarkdownButton } from './copy-page';

const { Layout } = DefaultTheme;
</script>

<template>
  <Layout>
    <template #doc-top>
      <CopyMarkdownButton />
    </template>
  </Layout>
</template>
