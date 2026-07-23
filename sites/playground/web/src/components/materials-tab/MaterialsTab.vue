<script setup>
import { TinyRadioGroup, TinyRadio, TinyCheckbox } from '@opentiny/vue';
import { ref, inject } from 'vue';
import { ThemePreviewCard } from '../theme-preview';
import { t } from '../../i18n';
import {
  FRAMEWORK_OPTIONS,
  COMPONENT_LIB_OPTIONS,
  MATERIAL_THEME_OPTIONS,
  MATERIAL_THEME_COLOR_MAP,
} from './materials-options';

defineProps({
  theme: { type: String, default: 'light' },
});

const emit = defineEmits(['update:theme']);

const { framework } = inject('playgroundContext');
const componentLib = ref('TinyVue');

const setFramework = (name) => {
  framework.value = name;
  // 其他框架不支持主题切换，默认设置为light
  if (name !== 'Vue') {
    emit('update:theme', MATERIAL_THEME_OPTIONS[0].value);
  }
};
</script>

<template>
  <div class="materials-tab">
    <div class="config-title">{{ t('materials.framework') }}</div>
    <div class="framework-group">
      <div
        v-for="item in FRAMEWORK_OPTIONS"
        :key="item.name"
        class="framework-btn"
        :class="{ 'framework-btn--active': framework === item.name }"
        @click="setFramework(item.name)"
        role="button"
        tabindex="0"
        @keydown.enter="setFramework(item.name)"
        @keydown.space.prevent="setFramework(item.name)"
      >
        <span class="framework-btn__icon">{{ item.icon }}</span>
        <span class="framework-btn__name">{{ item.name }}</span>
      </div>
    </div>

    <!-- TODO: 组件库切换暂时不支持 -->
    <!-- <div class="config-title">{{ t('materials.componentLib') }}</div>
    <div class="library-radio-group" role="radiogroup" :aria-label="t('materials.componentLib')">
      <tiny-radio-group v-model="componentLib" class="library-radio-group__inner">
        <tiny-radio v-for="item in COMPONENT_LIB_OPTIONS" :key="item" :label="item">{{ item }}</tiny-radio>
      </tiny-radio-group>
    </div> -->

    <template v-if="framework === 'Vue'">
      <div class="config-title">{{ t('materials.theme') }}</div>
      <div class="theme-card-group" role="radiogroup" :aria-label="t('materials.theme')">
        <div v-for="item in MATERIAL_THEME_OPTIONS" :key="item.value" class="theme-card-item">
          <div
            class="theme-card"
            :class="[`theme-card--${item.value}`, { 'theme-card--active': theme === item.value }]"
            role="radio"
            :aria-checked="theme === item.value"
            tabindex="0"
            @click="emit('update:theme', item.value)"
            @keydown.enter="emit('update:theme', item.value)"
            @keydown.space.prevent="emit('update:theme', item.value)"
          >
            <tiny-checkbox v-if="theme === item.value" class="theme-card__check" :model-value="true" @click.stop />
            <ThemePreviewCard :theme="item.value" :theme-colors="MATERIAL_THEME_COLOR_MAP[item.value]" />
          </div>
          <span class="theme-card__label" :class="{ 'theme-card__label--active': theme === item.value }">
            {{ t(item.textKey) }}
          </span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="less">
.materials-tab {
  .config-title {
    font-size: 14px;
    color: #595959;
    margin-bottom: 12px;
    margin-top: 16px;
    line-height: 32px;
  }

  .framework-group {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
  }

  .framework-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 0;
    border: 1px solid #e6e6e6;
    border-radius: 8px;
    background: transparent;
    cursor: pointer;
  }

  .framework-btn__icon {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #f5f5f5;
    font-weight: 600;
    font-size: 14px;
  }

  .framework-btn__name {
    font-size: 12px;
    line-height: 1;
    color: #595959;
  }

  .framework-btn--active {
    border-color: #191919;
    background: transparent;
  }

  .framework-btn--active .framework-btn__icon {
    background: #1476ff;
    color: #fff;
  }

  .framework-btn--active .framework-btn__name {
    color: #1476ff;
  }

  .library-radio-group {
    display: flex;
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 20px;
  }

  :deep(.library-radio-group__inner) {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .theme-card-group {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 20px;
    box-sizing: border-box;
  }

  .theme-card-item {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    min-width: 0;
    box-sizing: border-box;
  }

  .theme-card {
    position: relative;
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #e6e6e6;
    border-radius: 8px;
    padding: 8px 8px 0;
    cursor: pointer;
    user-select: none;
    overflow: hidden;
  }

  .theme-card__check {
    position: absolute;
    top: 6px;
    right: 6px;
    z-index: 1;
    pointer-events: none;

    :deep(.tiny-checkbox) {
      margin: 0;
    }

    :deep(.tiny-checkbox__label) {
      display: none;
    }
  }

  .theme-card__label {
    font-size: 12px;
    line-height: 1;
    color: #595959;
    text-align: center;
  }

  .theme-card__label--active {
    color: #191919;
    font-weight: 500;
  }

  .theme-card--active {
    border-color: #191919;
  }
}
</style>
