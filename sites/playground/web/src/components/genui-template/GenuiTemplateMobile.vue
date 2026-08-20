<script setup lang="ts">
import GenuiTemplateChat from './GenuiTemplateChat.vue';
import GenuiTemplateMobileSheet from './GenuiTemplateMobileSheet.vue';
import { useTemplateContext } from './composables';

defineProps<{
  theme: 'light' | 'dark' | 'lite' | 'auto';
}>();

const { conversation } = useTemplateContext();
</script>

<template>
  <div class="genui-schema-template is-mobile">
    <div class="genui-schema-template-item chat-container">
      <genui-template-chat
        v-if="conversation.isTemplateInit"
        class="genui-template-chat"
      />
    </div>
    <genui-template-mobile-sheet :theme="theme" />
  </div>
</template>

<style scoped lang="less">
.genui-schema-template {
  display: flex;
  flex-direction: column-reverse;
  margin-bottom: 0;
  width: 100%;
  min-height: 0;
  height: 100%;
  overflow: hidden;

  &-item {
    flex: 1 1 50%;
    min-height: 0;
  }

  .chat-container {
    display: flex;
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }
}

.genui-template-chat {
  width: 100%;
  min-height: 0;
}
</style>
