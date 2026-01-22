<script setup lang="ts">
import { CUSTOM_CONTEXT } from '@opentiny/genui-sdk-vue';
import TinyButton from '@opentiny/vue-button';
import { useAttrs, computed, inject } from 'vue';
import { useI18n } from '../../../../frameworks/vue/src/chat/i18n'; //TODO: replace with package name

const attrs = useAttrs();
const buttonAttrs: any = computed(() => {
  return {
    ...attrs,
  };
});
const customContext: any = inject(CUSTOM_CONTEXT, null);
const pageContext: any = inject('pageContext', null);

const { onAction } = (customContext.value || {}) as any;
const { state } = (pageContext || {}) as any;
const { t } = useI18n();

const doAction = () => {
  if (typeof onAction === 'function' && !customContext?.value?.generating) {
    const text = buttonAttrs.value.text;
    onAction({
      llmFriendlyMessage: t('actionButton.clickMessage', { text, state: JSON.stringify(state) }),
      humanFriendlyMessage: text,
    });
  }
};
</script>

<template>
  <TinyButton v-bind="buttonAttrs" @click="doAction" :disabled="customContext?.generating"></TinyButton>
</template>
