<script setup lang="ts">
import { provide, inject } from 'vue';
import { materials as defaultMaterials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
import { GENUI_MATERIALS } from '../config-provider/injection-tokens';
import GenuiRenderer from '../renderer/GenuiRenderer.vue';
import type { IRendererProps, IRendererSlots } from '../renderer/renderer.types';

defineProps<IRendererProps>();
defineSlots<IRendererSlots>();
const materials = inject(GENUI_MATERIALS, defaultMaterials.components);
provide(GENUI_MATERIALS, materials);
</script>

<template>
  <GenuiRenderer v-bind="$props">
    <template v-if="$slots.header" #header="slotProps">
      <slot name="header" v-bind="slotProps" />
    </template>
    <template v-if="$slots.footer" #footer="slotProps">
      <slot name="footer" v-bind="slotProps" />
    </template>
  </GenuiRenderer>
</template>
