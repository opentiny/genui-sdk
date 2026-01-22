<script setup lang="ts">
import TinyConfigProvider from '@opentiny/vue-config-provider';
import ThemeTool, { tinyDarkTheme, tinyOldTheme } from '@opentiny/vue-theme/theme-tool';
import { watch, provide, computed, onMounted, ref } from 'vue';
import type { LocaleType, I18n, TranslateFunction } from './i18n';
import { createTranslateFunction, setI18nInstance } from './i18n';
import { GENUI_CONFIG } from './injection-tokens';

export interface ConfigProviderProps {
  theme: string;
  id?: string;
  locale?: LocaleType;
  i18n?: Partial<Record<LocaleType, I18n>> | I18n;
  t?: TranslateFunction;
}

const props = withDefaults(defineProps<ConfigProviderProps>(), {
  id: 'tiny-genui-config-provider',
  locale: 'zh-CN' as LocaleType,
});

const transformTheme = (themeConfig: any) => {
  const newThemeConfig = structuredClone(themeConfig);
  newThemeConfig.css = newThemeConfig.css.replaceAll(':host', `#${props.id}`).replaceAll(':root', `#${props.id}`);
  return newThemeConfig;
};

const themeMap: Record<string, any> = {
  dark: transformTheme(tinyDarkTheme),
  lite: transformTheme(tinyOldTheme),
  vivid: { css: ' ' },
};

const themeTool = new ThemeTool();

const TinyGenuiConfig = computed(() => {
  return {
    theme: props.theme,
    id: props.id,
  };
});

provide(GENUI_CONFIG, TinyGenuiConfig);

watch(
  () => [props.locale, props.i18n, props.t] as const,
  () => {
    const locale = (props.locale || 'zh-CN') as LocaleType;
    const t: TranslateFunction = props.t || createTranslateFunction(locale, props.i18n);
    setI18nInstance(t);
  },
  { immediate: true },
);

watch(
  () => props.theme,
  (newVal) => {
    const themeConfig = themeMap[newVal] || themeMap.vivid;
    themeTool.changeTheme(themeConfig);
  },
  {
    immediate: true,
  },
);

const providerRef = ref();
onMounted(() => {
  providerRef.value?.$el.classList.remove('tiny-config-provider');
});
</script>

<template>
  <TinyConfigProvider ref="providerRef" class="tg-config-provider" :id="props.id">
    <slot />
  </TinyConfigProvider>
</template>

<style scoped>
.tg-config-provider {
  --tr-sender-bg-color: var(--tr-container-bg-default);
  --tr-sender-text-color: var(--tr-text-primary);
  --tr-sender-action-buttons-icon-color: var(--tr-text-secondary);
  --tr-sender-action-buttons-send-bg-color: var(--tr-color-primary);
  height: 100%;
}
</style>
