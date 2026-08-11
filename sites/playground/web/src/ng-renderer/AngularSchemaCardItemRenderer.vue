<script setup lang="ts">
import { computed, inject, defineAsyncComponent } from 'vue';
import type { BubbleContentRendererProps } from '@opentiny/tiny-robot';
import { useMessageContent } from '@opentiny/tiny-robot';
import { GENUI_SCHEMA_CARD_CONTEXT } from '@opentiny/genui-sdk-vue';

const GenuiRendererNg = defineAsyncComponent(() =>
  import('schema-renderer-ng-adpater').then((m) => m.SchemaRendererNgAdapter),
);

const props = defineProps<BubbleContentRendererProps>();
const { content } = useMessageContent(props);
const schemaContext = inject(GENUI_SCHEMA_CARD_CONTEXT);

const schemaItem = computed(
  () =>
    content.value as {
      type?: string;
      content?: string;
      id?: string;
      state?: Record<string, unknown>;
    },
);

const cardId = computed(() => schemaItem.value.id);
const cardContent = computed(() => schemaItem.value.content ?? '');
const cardState = computed(() => schemaItem.value.state);
const generating = computed(() => schemaContext?.isGeneratingCard(cardId.value) ?? false);
const customActions = computed(() => schemaContext?.customActionsMap.value ?? {});
const requiredCompleteFieldSelectors = computed(
  () => schemaContext?.requiredCompleteFieldSelectors.value ?? [],
);
</script>

<template>
  <div v-if="schemaContext && cardId" class="schema-card-item" data-type="schema-card">
    <GenuiRendererNg
      :id="cardId"
      :content="cardContent"
      :state="cardState"
      :generating="generating"
      :custom-actions="customActions"
      :required-complete-field-selectors="requiredCompleteFieldSelectors"
    />
  </div>
</template>
