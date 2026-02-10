<script setup lang="ts">
import { TinyConfigProvider } from '@opentiny/vue';
import { ThemeProvider } from '@opentiny/tiny-robot';
import ThemeTool, { tinyDarkTheme, tinyOldTheme } from '@opentiny/vue-theme/theme-tool';
import { watch, provide, computed, onMounted, ref } from 'vue';
import { I18nMessages, useI18n } from './i18n';
import { GENUI_I18N, GENUI_CONFIG } from './injection-tokens';

export interface ConfigProviderProps {
  theme: string;
  framework: string;
  locale?: string;
  id?: string;
  i18n?: I18nMessages;
}

interface IRobotProviderProps {
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

const genuiConfig = computed(() => {
  return {
    theme: props.theme,
    id: props.id,
  };
});

provide(GENUI_CONFIG, genuiConfig);

watch(
  () => [props.locale, props.i18n] as const,
  () => {
    i18n.setLocale(props.locale);
    i18n.mergeMessages(props.i18n);
  },
  { immediate: true },
);

watch(
  () => props.theme,
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
  const providerProps: IRobotProviderProps = {};
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
