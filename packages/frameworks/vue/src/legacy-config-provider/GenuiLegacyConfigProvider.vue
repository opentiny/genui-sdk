<script setup lang="ts">
import { materials as defaultMaterials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
import GenuiConfigProvider from '../config-provider/ConfigProvider.vue';
import type { LegacyConfigProviderProps } from './legacy-config-provider.types';

defineProps<LegacyConfigProviderProps>();
</script>

<template>
  <GenuiConfigProvider v-bind="$props" :materials="defaultMaterials">
    <slot />
  </GenuiConfigProvider>
</template>
