<script setup lang="ts">
import { computed } from 'vue';
import { GenuiRenderer } from '@opentiny/genui-sdk-vue';
import type { IMessageItem, IJsonPatchMessageItem, ISchemaCardMessageItem } from './chat.types';
import { jsonPatchDeduplicator } from './json-patch-deduplicator';
import SchemaVersionCard from './SchemaVersionCard.vue';
import { useIsMobile } from '../../use-mobile';

const props = defineProps<{
  itemProps: any;
  type: 'json-patch' | 'schema-card';
  prevSchema: string;
  errorMessagesMap: Map<string, string>;
  messages: any[];
}>();

const emit = defineEmits<{
  (event: 'schema-version-toggle', schema: Record<string, unknown>, cardId: string): void;
}>();

const { isMobile } = useIsMobile();

const generating = computed(() => !props.itemProps?.generatedTime);

const genuiRendererProps = computed(() => ({
  ...props.itemProps,
  requiredCompleteFieldSelectors: props.itemProps?.requiredCompleteFieldSelectors || [],
  generating: generating.value,
  key: props.itemProps?.cardId,
}));

const handleSchemaVersionCardClick = (cardId: string) => {
  let targetStr = '';

  props.messages.some((msg) => {
    const card = (msg.messages as IMessageItem[])?.find(
      (message): message is IJsonPatchMessageItem | ISchemaCardMessageItem =>
        (message.type === 'schema-card' || message.type === 'json-patch') && message.cardId === cardId,
    );

    if (card) {
      targetStr = card.schema;
      return true;
    }

    return false;
  });

  if (!targetStr) {
    return;
  }

  try {
    const targetSchema = JSON.parse(targetStr);
    jsonPatchDeduplicator.clearCardOperations(cardId);
    emit('schema-version-toggle', targetSchema, cardId);
  } catch (error) {
    console.error('Failed to parse schema for version toggle:', error);
  }
};
</script>

<template>
  <div v-if="generating && isMobile">
    <genui-renderer v-bind="genuiRendererProps" />
  </div>
  <schema-version-card
    v-else
    :key="itemProps?.cardId"
    :prev-schema="prevSchema"
    :error-messages-map="errorMessagesMap"
    :type="type"
    v-bind="itemProps"
    @click="handleSchemaVersionCardClick"
  />
</template>
