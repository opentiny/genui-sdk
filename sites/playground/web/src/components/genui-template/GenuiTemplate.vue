<script setup lang="ts">
import { watch, onMounted, onUnmounted } from 'vue';
import { GenuiConfigProvider } from '@opentiny/genui-sdk-vue';
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
import { useIsMobile } from '../../use-mobile';
import GenuiTemplateDesktop from './GenuiTemplateDesktop.vue';
import GenuiTemplateMobile from './GenuiTemplateMobile.vue';
import { locale } from '../../i18n';
import { provideTemplateContext } from './composables/use-template-context';
import { provideSchemaDevMode } from './useSchemaDevMode';

defineProps<{
  theme: 'light' | 'dark' | 'lite' | 'auto';
}>();

const { isMobile } = useIsMobile();
const { schema, conversation, actions } = provideTemplateContext();
provideSchemaDevMode();

watch(() => schema.currentPreviewSchemaComplete, (isComplete) => {
  if (isComplete && actions.shouldSyncEditorBaseline()) {
    actions.syncBaseline();
  }
});

watch(() => conversation.currentConversationId, actions.resetAll);

watch(
  () => conversation.templateConversationState?.loading,
  (loading, prevLoading) => {
    if (prevLoading === true && loading === false) {
      actions.resetToLatestVersion();
    }
  },
);

onMounted(() => {
  actions.resetToLatestVersion();
  window.addEventListener('keydown', actions.handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', actions.handleKeydown);
});
</script>

<template>
  <GenuiConfigProvider
    :theme="theme"
    :locale="locale"
    :materials="materials"
    style="width: 100%; height: 100%"
  >
    <GenuiTemplateMobile v-if="isMobile" :theme="theme" />
    <GenuiTemplateDesktop v-else :theme="theme" />
  </GenuiConfigProvider>
</template>
