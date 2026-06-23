<script setup lang="ts">
import { computed } from 'vue';
import docCardIcon from '../assets/images/card.svg';
import { getBuilderPreviewBridge, truncateText } from '../builder';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  id: string;
  title: string;
  input: string;
  schema: string;
  createdTime: string;
}>();

const generating = computed(() => !props.createdTime);
const clickable = computed(() => Boolean(props.createdTime));

const displayTitle = computed(() => truncateText(props.title?.trim() || props.input?.trim() || ''));

const handleClick = () => {
  if (!clickable.value) {
    return;
  }

  const preview = getBuilderPreviewBridge();
  if (!preview) {
    return;
  }

  preview.openCard({
    type: 'builder-card',
    id: props.id,
    title: props.title,
    input: props.input,
    schema: props.schema,
    createdTime: props.createdTime,
  });
};
</script>

<template>
  <div
    class="builder-card"
    :class="{ 'builder-card--clickable': clickable }"
    @click="handleClick"
  >
    <div class="builder-card__main">
      <div class="builder-card__icon">
        <img :src="docCardIcon" alt="" class="builder-card__icon-image" />
      </div>
      <div class="builder-card__content">
        <div class="builder-card__title">{{ displayTitle }}</div>
        <div class="builder-card__time">
          <template v-if="generating">生成中...</template>
          <template v-else>创建时间：{{ createdTime }}</template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.builder-card {
  width: 330px;
  max-width: 330px;
  box-sizing: border-box;
  border-radius: 12px;
  background-color: var(--tr-bubble-content-bg, #fff);
  padding: 16px;

  &--clickable {
    cursor: pointer;

    &:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }
  }

  &__main {
    display: flex;
    align-items: center;
  }

  &__icon {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
  }

  &__icon-image {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: contain;
  }

  &__content {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    margin-left: 8px;
    height: 40px;
    min-width: 0;
  }

  &__title {
    font-size: 14px;
    font-weight: 400;
    line-height: 22px;
    color: var(--tr-text-primary, rgb(25, 25, 25));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__time {
    font-size: 12px;
    line-height: 18px;
    color: var(--tr-text-secondary, rgb(128, 128, 128));
  }
}
</style>
