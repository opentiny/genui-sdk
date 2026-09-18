<script setup lang="ts">
import { ThemeProvider } from '@opentiny/tiny-robot';
import type { MergedMaterials } from '@opentiny/genui-sdk-core';
import { watch, provide, inject, computed } from 'vue';
import { RENDERER_SETTINGS_KEY } from '@opentiny/tiny-schema-renderer';
import { I18nMessages, useI18n } from '../chat/i18n';
import { GENUI_I18N, GENUI_CONFIG, GENUI_MATERIALS } from './injection-tokens';
import { MaterialsRuntimeRoots, useMaterialsRuntime } from './use-materials-runtime';
import { useMediaTheme } from './use-media-theme';
import type { NotifyHandler } from './notify.types';

export type { NotifyHandler };

export interface ConfigProviderProps {
  theme?: string;
  id?: string;
  locale?: string;
  i18n?: I18nMessages;
  materials?: MergedMaterials;
  notify?: NotifyHandler;
}

const props = withDefaults(defineProps<ConfigProviderProps>(), {
  id: 'tiny-genui-config-provider',
  locale: 'zh_CN',
});

const i18n = useI18n();
provide(GENUI_I18N, i18n);

const { theme: mediaTheme } = useMediaTheme();
const { colorScheme, runtimeRoots } = useMaterialsRuntime({
  materials: () => props.materials,
  theme: () => props.theme,
  locale: () => props.locale,
  systemColorScheme: mediaTheme,
});

const genuiConfig = computed(() => ({
  colorScheme: colorScheme.value,
  id: props.id,
}));

provide(GENUI_CONFIG, genuiConfig);

const internalMaterials = {};
watch(
  () => props.materials,
  (newVal) => {
    Object.assign(internalMaterials, newVal);
  },
  { immediate: true },
);

provide(GENUI_MATERIALS, internalMaterials);

const parentRendererSettings = inject(RENDERER_SETTINGS_KEY, {}) as Record<string, any>;
const rendererSettings = {
  ...(parentRendererSettings && typeof parentRendererSettings === 'object' ? parentRendererSettings : {}),
};
watch(
  () => props.notify,
  (notify) => {
    rendererSettings.notify = notify ?? parentRendererSettings?.notify;
  },
  { immediate: true },
);
provide(RENDERER_SETTINGS_KEY, rendererSettings);

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

const robotProviderProps = computed(() => ({
  colorMode: colorScheme.value,
  targetElement: `#${props.id}`,
}));
</script>

<template>
  <div :id="props.id" class="tg-config-provider">
    <ThemeProvider v-bind="robotProviderProps">
      <MaterialsRuntimeRoots :roots="runtimeRoots">
        <slot />
      </MaterialsRuntimeRoots>
    </ThemeProvider>
  </div>
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
