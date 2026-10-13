<script setup lang="ts">
import { computed } from 'vue';
import { t } from '../i18n';

export interface ModeSwitchOption {
  value: string;
  label: string;
  icon?: string;
}

const props = defineProps<{
  modelValue: string;
  options: ModeSwitchOption[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const activeIndex = computed(() => {
  const index = props.options.findIndex((option) => option.value === props.modelValue);
  return index >= 0 ? index : 0;
});

const thumbStyle = computed(() => ({
  width: `calc((100% - 4px) / ${props.options.length})`,
  transform: `translateX(calc(${activeIndex.value} * 100%))`,
}));

const handleSelect = (value: string) => {
  if (value !== props.modelValue) {
    emit('update:modelValue', value);
  }
};
</script>

<template>
  <div
    class="mode-switch-slider"
    role="group"
    :aria-label="t('sidebar.mode')"
    :style="{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }"
  >
    <div class="mode-switch-slider__thumb" aria-hidden="true" :style="thumbStyle" />
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="mode-switch-slider__option"
      :class="{ 'mode-switch-slider__option--active': modelValue === option.value }"
      :aria-pressed="modelValue === option.value"
      @click="handleSelect(option.value)"
    >
      <span v-if="option.icon" class="mode-switch-slider__icon" :innerHTML="option.icon" aria-hidden="true" />
      <span class="mode-switch-slider__label">{{ option.label }}</span>
    </button>
  </div>
</template>

<style scoped lang="less">
.mode-switch-slider {
  position: relative;
  display: grid;
  align-items: center;
  width: fit-content;
  height: 24px;
  padding: 2px;
  border-radius: 382px;
  background-color: #f0f0f0;
  box-sizing: border-box;

  &__thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    height: calc(100% - 4px);
    border-radius: 382px;
    background-color: #fff;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
    transition: transform 0.2s ease;
    pointer-events: none;
  }

  &__option {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-width: 0;
    height: 100%;
    padding: 0 8px;
    border: none;
    border-radius: 382px;
    background: transparent;
    font-size: 12px;
    line-height: 1;
    font-weight: 400;
    color: inherit;
    cursor: pointer;
    white-space: nowrap;

    &--active {
      font-weight: 700;
    }

    &:focus-visible {
      outline: 2px solid #1677ff;
      outline-offset: 1px;
    }
  }

  &__icon {
    display: inline-flex;
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    align-items: center;
    justify-content: center;

    :deep(svg) {
      width: 16px;
      height: 16px;
      display: block;
    }
  }

  &__label {
    white-space: nowrap;
  }
}
</style>
