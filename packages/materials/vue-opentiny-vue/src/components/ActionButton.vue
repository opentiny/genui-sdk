<script setup lang="ts">
import TinyButton from '@opentiny/vue-button';
import { useAttrs, computed, inject } from 'vue';
import { i18nMessages } from './i18n';

const attrs = useAttrs();
const buttonAttrs: any = computed(() => {
  return {
    ...attrs,
  };
});
const customContext: any = inject('customContext');
const pageContext: any = inject('pageContext');

const i18n = inject('genuiI18n') as any;
const { onAction } = (customContext.value || {}) as any;
const { state } = (pageContext || {}) as any;

i18n?.mergeMessages(i18nMessages)

const doAction = () => {
  if (typeof onAction === 'function' && !customContext?.value?.generating) {
    const text = buttonAttrs.value.text;
    onAction({
      llmFriendlyMessage: i18n?.t('actionButton.clickMessage', { text, state: JSON.stringify(state) }),
      humanFriendlyMessage: text,
      context: {},
    });
  }
};
</script>

<template>
  <TinyButton v-bind="buttonAttrs" @click="doAction" :disabled="customContext?.generating"></TinyButton>
</template>
