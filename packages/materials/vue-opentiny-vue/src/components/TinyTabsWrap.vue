<script setup lang="ts">
import TinyTabs from '@opentiny/vue-tabs';
import { useAttrs, useSlots, computed, onUpdated, ref } from 'vue';
const attrs = useAttrs();
const slots = useSlots();
const tabItemLength = ref(0);
const userClick = ref(false);
onUpdated(() => {
  if (userClick.value) {
    return;
  }
  const defaultSlot = slots.default?.({});
  if (defaultSlot?.length === tabItemLength.value) {
    return;
  }
  const lastTab = defaultSlot?.[defaultSlot.length - 1];
  const newActiveName = lastTab?.props?.name;
  if (!newActiveName) {
    return;
  }
  tabItemLength.value = defaultSlot?.length || 0;
  if (newActiveName) {
    activeName.value = newActiveName;
  }
});
const activeName = ref(attrs.modelValue);
const tabsAttrs = computed(() => {
  return {
    options: [],
    ...attrs,
    modelValue: activeName.value,
    'onUpdate:modelValue': (value: string) => {
      activeName.value = value;
      (attrs['onUpdate:modelValue'] as Function)?.(value);
    },
    onClick: (...args) => {
      userClick.value = true;
      (attrs['onClick'] as Function)?.(...args);
    },
  };
});
</script>

<template>
  <TinyTabs v-bind="tabsAttrs">
    <template #default>
      <slot></slot>
    </template>
  </TinyTabs>
  <span></span>
</template>
