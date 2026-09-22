<script setup lang="ts">
import { ref } from 'vue';
import { materials as defaultMaterials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
import GenuiConfigProvider from '../config-provider/ConfigProvider.vue';
import GenuiChat from '../chat/GenuiChat.vue';
import type { IChatProps } from '../chat/chat.types';

defineProps<IChatProps>();

const chatRef = ref<InstanceType<typeof GenuiChat>>();

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
  <GenuiConfigProvider :materials="defaultMaterials">
    <GenuiChat ref="chatRef" v-bind="$props">
      <template v-for="(_, name) in $slots" #[name]="slotProps">
        <slot :name="name" v-bind="slotProps || {}" />
      </template>
    </GenuiChat>
  </GenuiConfigProvider>
</template>
