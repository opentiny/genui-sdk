<script setup lang="ts">
import { computed, provide, ref } from 'vue';
import SchemaRenderer, { RENDERER_SETTINGS_KEY } from '@opentiny/tiny-schema-renderer';
import { materials } from '../src/materials';
import { demos } from './mock';

const activeId = ref(demos[0].id);
const current = computed(() => demos.find((demo) => demo.id === activeId.value) ?? demos[0]);

provide(RENDERER_SETTINGS_KEY, {
  materials: materials.components,
});
</script>

<template>
  <header class="app-header">
    <h1>vue-element-plus 物料本地验证</h1>
    <nav class="demo-tabs">
      <button
        v-for="demo in demos"
        :key="demo.id"
        type="button"
        class="demo-tab"
        :class="{ active: activeId === demo.id }"
        @click="activeId = demo.id"
      >
        {{ demo.label }}
      </button>
    </nav>
  </header>
  <main class="app-content">
    <SchemaRenderer :schema="current.schema" />
  </main>
</template>
