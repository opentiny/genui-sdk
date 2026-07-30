<script setup>
import { TinyRadioGroup, TinyRadio, TinyCheckbox } from '@opentiny/vue';
import { inject, computed } from 'vue';
import { ThemePreviewCard } from '../theme-preview';
import { t } from '../../i18n';
import {
  FRAMEWORK_OPTIONS,
  COMPONENT_LIB_OPTIONS_BY_FRAMEWORK,
  DEFAULT_COMPONENT_LIB,
  MATERIAL_THEME_OPTIONS,
  MATERIAL_THEME_COLOR_MAP,
} from './materials-options';

defineProps({
  theme: { type: String, default: 'light' },
});

const emit = defineEmits(['update:theme']);

const { framework, componentLib } = inject('playgroundContext');

const componentLibOptions = computed(() => COMPONENT_LIB_OPTIONS_BY_FRAMEWORK[framework.value]);

const setFramework = (name) => {
  framework.value = name;
  componentLib.value = DEFAULT_COMPONENT_LIB[name];
  // Angular 不支持主题切换, 默认设置为 light 主题
  if(name === 'Angular') {
    emit('update:theme', MATERIAL_THEME_OPTIONS[0].value)
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
        <span class="framework-btn__icon">
          <img class="framework-btn__img" :src="item.icon" alt="item.name">
        </span>
        <span class="framework-btn__name">{{ item.name }}</span>
      </div>
    </div>

    <!-- TODO: 组件库切换暂时不支持 -->
    <div class="config-title">{{ t('materials.componentLib') }}</div>
    <div class="library-radio-group" role="radiogroup" :aria-label="t('materials.componentLib')">
      <tiny-radio-group v-model="componentLib" class="library-radio-group__inner">
        <tiny-radio v-for="item in componentLibOptions" :key="item" :label="item">{{ item }}</tiny-radio>
      </tiny-radio-group>
    </div>

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
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .framework-btn__img {
    width: 100%;
    height: 100%;
  }

  .framework-btn__name {
    font-size: 12px;
    line-height: 1;
    color: rgba(25, 25, 25, 1);
  }

  .framework-btn--active {
    border-color: rgba(20, 118, 255, 1);
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
    text-align: left;
    padding-left: 8px;
  }

  .theme-card__label--active {
    color: #191919;
    font-weight: 500;
  }

  .theme-card--active {
    border-color: rgba(20, 118, 255, 1);
  }
}
</style>
