<script setup lang="ts">
import { TinyConfigProvider } from '@opentiny/vue';
import { ThemeProvider } from '@opentiny/tiny-robot';
import ThemeTool, { tinyDarkTheme, tinyOldTheme } from '@opentiny/vue-theme/theme-tool';
import { watch, provide, computed, onMounted, ref, Component } from 'vue';
import { IRendererConfig, buildMaterialDefaultValueMap } from '@opentiny/genui-sdk-core';
import { I18nMessages, useI18n } from '../chat/i18n';
import { GENUI_I18N, GENUI_CONFIG, GENUI_MATERIALS, GENUI_DEFAULT_PROPS_MAP } from '../chat/injection-tokens';
import { useMediaTheme } from './use-media-theme';

export interface ConfigProviderProps {
  theme?: 'light' | 'dark' | 'lite' | 'auto';
  id?: string;
  locale?: string;
  i18n?: I18nMessages;
  materials?: Record<string, Component>;
  rendererConfig?: IRendererConfig;
}

interface IRobotProviderProps {
  colorMode: 'dark' | 'light';
  targetElement?: string;
}

const props = withDefaults(defineProps<ConfigProviderProps>(), {
  id: 'tiny-genui-config-provider',
  locale: 'zh_CN',
});

const i18n = useI18n();
provide(GENUI_I18N, i18n);

const transformTheme = (themeConfig: any) => {
  const newThemeConfig = structuredClone(themeConfig);
  newThemeConfig.css = newThemeConfig.css.replaceAll(':host', `#${props.id}`).replaceAll(':root', `#${props.id}`);
  return newThemeConfig;
};

const themeMap: Record<string, any> = {
  dark: transformTheme(tinyDarkTheme),
  lite: transformTheme(tinyOldTheme),
  light: { css: ' ' },
};

const themeTool = new ThemeTool();

const { theme: mediaTheme } = useMediaTheme();

const actualTheme = computed(() => {
  if (props.theme === 'auto') {
    return mediaTheme.value;
  }
  return props.theme;
});

const genuiConfig = computed(() => {
  return {
    theme: actualTheme.value,
    id: props.id,
  };
});

provide(GENUI_CONFIG, genuiConfig);

provide(GENUI_MATERIALS, {
  ...(props.materials ?? {}),
});

provide(GENUI_DEFAULT_PROPS_MAP, buildMaterialDefaultValueMap(props.rendererConfig ?? {}));

watch(
  () => [props.locale, props.i18n] as const,
  () => {
    if (props.locale && props.locale !== i18n.locale.value) {
      i18n.setLocale(props.locale);
    }
    props.i18n && i18n.mergeMessages(props.i18n);
  },
  { immediate: true },
);

watch(
  () => actualTheme.value,
  (newVal) => {
    const themeConfig = themeMap[newVal] || themeMap.light;
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

const robotProviderProps = computed(() => {
  const providerProps: IRobotProviderProps = {
    colorMode: actualTheme.value === 'dark' ? 'dark' : 'light',
  };
  if (genuiConfig?.value?.id) {
    providerProps.targetElement = '#' + genuiConfig.value.id;
  }
  return providerProps;
});
</script>

<template>
  <TinyConfigProvider ref="providerRef" class="tg-config-provider" :id="props.id">
    <ThemeProvider v-bind="robotProviderProps">
      <slot />
    </ThemeProvider>
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
