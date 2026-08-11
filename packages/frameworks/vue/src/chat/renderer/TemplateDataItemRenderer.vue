<script setup lang="ts">
import { computed } from 'vue';
import type { BubbleContentRendererProps } from '@opentiny/tiny-robot';
import { useMessageContent } from '@opentiny/tiny-robot';
import TemplateDataRenderer from './TemplateDataRenderer.vue';
import type { UserItem } from '../chat.types';
import type { FileMeta } from '../file-upload/file-utils';

const props = defineProps<BubbleContentRendererProps>();
const { content } = useMessageContent(props);

const templateItem = computed(
  () =>
    content.value as {
      type?: string;
      templateData?: UserItem[];
      attachments?: FileMeta[];
    },
);

const templateData = computed(() => templateItem.value.templateData ?? []);
const attachments = computed(() => templateItem.value.attachments ?? []);
</script>

<template>
  <div data-type="templateData">
    <TemplateDataRenderer :template-data="templateData" :attachments="attachments" />
  </div>
</template>
