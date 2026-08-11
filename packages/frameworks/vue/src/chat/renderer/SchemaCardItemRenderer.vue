<script setup lang="ts">
import { computed, defineComponent, inject } from 'vue';
import type { BubbleContentRendererProps } from '@opentiny/tiny-robot';
import { useMessageContent } from '@opentiny/tiny-robot';
import { GenuiRenderer } from '../../renderer';
import { toSlotFunction } from '../chat-utils';
import { GENUI_SCHEMA_CARD_CONTEXT } from '../schemaCardContext';

const props = defineProps<BubbleContentRendererProps>();
const { content } = useMessageContent(props);
const schemaContext = inject(GENUI_SCHEMA_CARD_CONTEXT);

const schemaItem = computed(() =>
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

const customComponents = computed(() => schemaContext?.customComponentsMap.value ?? {});
const customActions = computed(() => schemaContext?.customActionsMap.value ?? {});
const requiredCompleteFieldSelectors = computed(
  () => schemaContext?.requiredCompleteFieldSelectors.value ?? [],
);

const headerSlot = computed(() => toSlotFunction(schemaContext?.rendererSlots.value?.header));
const footerSlot = computed(() => toSlotFunction(schemaContext?.rendererSlots.value?.footer));

const SchemaCardSlotHost = defineComponent({
  name: 'SchemaCardSlotHost',
  props: {
    renderFn: { type: Function, required: true },
    slotProps: { type: Object, required: true },
  },
  setup(hostProps) {
    return () => hostProps.renderFn(hostProps.slotProps);
  },
});
</script>

<template>
  <div v-if="schemaContext && cardId" class="schema-card-item" data-type="schema-card">
    <GenuiRenderer
      :id="cardId"
      :content="cardContent"
      :state="cardState"
      :generating="generating"
      :custom-components="customComponents"
      :custom-actions="customActions"
      :required-complete-field-selectors="requiredCompleteFieldSelectors"
    >
      <template v-if="headerSlot" #header="slotProps">
        <SchemaCardSlotHost :render-fn="headerSlot" :slot-props="slotProps" />
      </template>
      <template v-if="footerSlot" #footer="slotProps">
        <SchemaCardSlotHost :render-fn="footerSlot" :slot-props="slotProps" />
      </template>
    </GenuiRenderer>
  </div>
</template>
