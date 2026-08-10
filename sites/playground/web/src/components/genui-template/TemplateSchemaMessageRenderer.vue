<script setup lang="ts">
import { computed } from 'vue';
import { GenuiRenderer } from '@opentiny/genui-sdk-vue';
import SchemaVersionCard from './SchemaVersionCard.vue';
import { useIsMobile } from '../../use-mobile';
import { useTemplateContext } from './composables';
import { rebuildSchemaFromCard } from './template-chat-utils';

const props = defineProps<{
  itemProps: any;
  type: 'json-patch' | 'schema-card' | 'schema-manual';
  prevSchema: string;
}>();

const { isMobile } = useIsMobile();
const { conversation, versionControl, actions } = useTemplateContext();

const generating = computed(() => !props.itemProps?.generatedTime);

const genuiRendererProps = computed(() => ({
  ...props.itemProps,
  requiredCompleteFieldSelectors: props.itemProps?.requiredCompleteFieldSelectors || [],
  generating: generating.value,
  key: props.itemProps?.cardId,
}));

const schemaVersionCardProps = computed(() => ({
  ...props.itemProps,
  prevSchema: props.prevSchema || props.itemProps?.prevSchema || '',
}));

const handleSchemaVersionCardClick = (cardId: string) => {
  if (!cardId) {
    return;
  }

  const card = versionControl.getMessageByCardId(cardId);
  const schema = card ? rebuildSchemaFromCard(card, { messages: conversation.messages }) : null;
  actions.handleSchemaVersionToggle(schema, cardId);
};
</script>

<template>
  <div v-if="generating && isMobile">
    <genui-renderer v-bind="genuiRendererProps" />
  </div>
  <schema-version-card
    v-else
    :key="itemProps?.cardId"
    :type="type"
    v-bind="schemaVersionCardProps"
    @card-select="handleSchemaVersionCardClick"
  />
</template>
