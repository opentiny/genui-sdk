<script setup lang="ts">
import { inject, provide, ref } from 'vue';
import { materials as defaultMaterials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
import { GENUI_MATERIALS } from '../config-provider/injection-tokens';
import { GENUI_CONFIG_PROVIDER } from '../config-provider/internal-injection-token';
import GenuiChat from '../chat/GenuiChat.vue';
import type { IChatProps } from '../chat/chat.types';

defineProps<IChatProps>();

const chatRef = ref<InstanceType<typeof GenuiChat>>();
const configProvider = inject(GENUI_CONFIG_PROVIDER, null);
if (configProvider) {
  configProvider.setMaterials(defaultMaterials);
} else {
  provide(GENUI_MATERIALS, defaultMaterials);
}

defineExpose(
  new Proxy({} as InstanceType<typeof GenuiChat>, {
    get(_target, prop) {
      const instance = chatRef.value;
      const value = instance?.[prop as keyof typeof instance];
      return typeof value === 'function' ? value.bind(instance) : value;
    },
  }),
);
</script>

<template>
  <GenuiChat ref="chatRef" v-bind="$props">
    <template v-for="(_, name) in $slots" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps || {}" />
    </template>
  </GenuiChat>
</template>
