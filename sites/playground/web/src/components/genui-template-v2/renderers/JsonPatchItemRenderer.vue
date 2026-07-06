<script setup lang="ts">
import { computed, inject } from 'vue';
import type { BubbleContentRendererProps } from '@opentiny/tiny-robot';
import { useMessageContent } from '@opentiny/tiny-robot';
import TemplateSchemaMessageRenderer from '../../genui-template/TemplateSchemaMessageRenderer.vue';
import { TEMPLATE_CHAT_CONTEXT } from '../templateChatContext';

const props = defineProps<BubbleContentRendererProps>();
const { content } = useMessageContent(props);
const templateContext = inject(TEMPLATE_CHAT_CONTEXT);

const itemProps = computed(() => content.value as Record<string, unknown>);
</script>

<template>
  <div v-if="templateContext" data-type="json-patch">
    <TemplateSchemaMessageRenderer
      :item-props="itemProps"
      type="json-patch"
      :prev-schema="templateContext.prevSchema.value"
      :error-messages-map="templateContext.errorMessagesMap.value"
      :messages="templateContext.allMessages.value"
      @schema-version-toggle="templateContext.onSchemaVersionToggle"
    />
  </div>
</template>
