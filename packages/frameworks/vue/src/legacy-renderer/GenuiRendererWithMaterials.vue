<script setup lang="ts">
import { materials as defaultMaterials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
import GenuiConfigProvider from '../config-provider/ConfigProvider.vue';
import GenuiRenderer from '../renderer/GenuiRenderer.vue';
import type { IRendererProps, IRendererSlots } from '../renderer/renderer.types';

defineProps<IRendererProps>();
defineSlots<IRendererSlots>();
</script>

<template>
  <GenuiConfigProvider :materials="defaultMaterials">
    <GenuiRenderer v-bind="$props">
      <template v-if="$slots.header" #header="slotProps">
        <slot name="header" v-bind="slotProps" />
      </template>
      <template v-if="$slots.footer" #footer="slotProps">
        <slot name="footer" v-bind="slotProps" />
      </template>
    </GenuiRenderer>
  </GenuiConfigProvider>
</template>
