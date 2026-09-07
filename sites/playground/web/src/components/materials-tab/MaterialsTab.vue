<script setup>
import { TinyRadioGroup, TinyRadio, TinyCheckbox } from '@opentiny/vue';
import { inject, computed } from 'vue';
import { t } from '../../i18n';
import { PlaygroundMode } from '../../constants';
import {
  getFrameworkOptions,
  componentLibOptionsByFramework,
  MATERIAL_THEME_OPTIONS,
} from './materials-options';
import vueIcon from '../../assets/images/vue.svg';
import angularIcon from '../../assets/images/angular.svg';
import reactIcon from '../../assets/images/react.svg';
import themeLight from '../../assets/images/theme-light.png';
import themeDark from '../../assets/images/theme-dark.png';
import themeLite from '../../assets/images/theme-lite.png';
import themeAuto from '../../assets/images/theme-auto.png';

const themePreviewMap = {
  light: themeLight,
  dark: themeDark,
  lite: themeLite,
  auto: themeAuto,
};

const props = defineProps({
  theme: { type: String, default: 'light' },
  currentMode: { type: String, default: PlaygroundMode.Chat },
});

const emit = defineEmits(['update:theme']);

const { framework, componentLib, setFramework, setComponentLib } = inject('playgroundContext');
const frameworkOptions = computed(() => getFrameworkOptions(props.currentMode));
const frameworkIconMap = {
  Vue: vueIcon,
  Angular: angularIcon,
  React: reactIcon,
};

const componentLibOptions = computed(() => componentLibOptionsByFramework[framework.value]);

const componentLibModel = computed({
  get: () => componentLib.value,
  set: (val) => setComponentLib(val),
});

const handleSetFramework = (name) => {
  setFramework(name);
  // Angular 和 React 不支持主题切换, 默认设置为 light 主题
  if (name === 'Angular' || name === 'React') {
    emit('update:theme', MATERIAL_THEME_OPTIONS[0].value);
  }
};
</script>

<template>
  <div class="materials-tab">
    <div class="config-title">{{ t('materials.framework') }}</div>
    <div class="framework-group">
      <div
        v-for="item in frameworkOptions"
        :key="item.name"
        class="framework-btn"
        :class="{ 'framework-btn--active': framework === item.name }"
        @click="handleSetFramework(item.name)"
        role="button"
        tabindex="0"
        @keydown.enter="handleSetFramework(item.name)"
        @keydown.space.prevent="handleSetFramework(item.name)"
      >
        <span class="framework-btn__icon">
          <img :src="frameworkIconMap[item.name]" :alt="item.name" />
        </span>
        <span class="framework-btn__name">{{ t(item.textKey) }}</span>
      </div>
    </div>

    <div class="config-title">{{ t('materials.componentLib') }}</div>
    <div class="library-radio-group" role="radiogroup" :aria-label="t('materials.componentLib')">
      <tiny-radio-group v-model="componentLibModel" class="library-radio-group__inner">
        <tiny-radio v-for="item in componentLibOptions" :key="item" :label="item">{{ item }}</tiny-radio>
      </tiny-radio-group>
    </div>

    <template v-if="framework === 'Vue' && componentLib === 'TinyVue'">
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
            <img class="theme-card__image" :src="themePreviewMap[item.value]" :alt="t(item.textKey)" />
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
    position: relative;
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
    font-weight: 600;
    font-size: 14px;
  }

  .framework-btn__icon img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .framework-btn__name {
    font-size: 12px;
    line-height: 1;
    color: #595959;
  }

  .framework-btn--active {
    border-color: rgba(20, 118, 255, 1);
    background: transparent;
  }

  .framework-btn--active .framework-btn__icon {
    color: #fff;
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

  .theme-card__image {
    display: block;
    width: 100%;
    height: 96px;
    border-radius: 6px;
    object-fit: cover;
  }

  .theme-card-item:first-child .theme-card__image {
    transform: scale(1.06);
    transform-origin: center top;
  }

  .theme-card__label {
    font-size: 12px;
    line-height: 1;
    color: #595959;
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
