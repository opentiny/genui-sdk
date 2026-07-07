<script setup lang="ts">
import { computed } from 'vue';
import type { BubbleContentRendererProps } from '@opentiny/tiny-robot';
import { useMessageContent } from '@opentiny/tiny-robot';
import { t } from '../../i18n';

const props = defineProps<BubbleContentRendererProps>();
const { content } = useMessageContent(props);

const visible = computed(() => {
  const item = content.value as { emitter?: unknown; message?: unknown };
  return Boolean(item?.emitter && item?.message);
});
</script>

<template>
  <div v-if="visible" data-type="loading-text" class="template-loading-text">
    {{ t('loading.response') }}
  </div>
</template>

<style scoped>
.template-loading-text {
  color: #999;
  font-size: 14px;
}
</style>
