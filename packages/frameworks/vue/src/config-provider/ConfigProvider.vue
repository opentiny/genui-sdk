<script setup lang="ts">
import { ThemeProvider } from '@opentiny/tiny-robot';
import {
  type IMaterialsTheme,
  type MaterialsThemeFactory,
  type MergedMaterials,
  type IThemeApplyResult,
  type ThemeColorScheme,
} from '@opentiny/genui-sdk-core';
import {
  watch,
  provide,
  inject,
  computed,
  ref,
  shallowRef,
  onBeforeUnmount,
  defineComponent,
  h,
  type Component,
  type PropType,
  type VNode,
} from 'vue';
import { RENDERER_SETTINGS_KEY } from '@opentiny/tiny-schema-renderer';
import { I18nMessages, useI18n } from '../chat/i18n';
import { GENUI_I18N, GENUI_CONFIG, GENUI_MATERIALS } from './injection-tokens';
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

const themeFactories = computed<MaterialsThemeFactory[]>(() => {
  const themeFactory = props.materials?.themeFactory;
  if (!themeFactory) {
    return [];
  }
  return Array.isArray(themeFactory) ? themeFactory : [themeFactory];
});

const themeInstances = new Map<MaterialsThemeFactory, IMaterialsTheme>();
const materialThemes = computed<IMaterialsTheme[]>(() => {
  const factories = themeFactories.value;
  for (const key of themeInstances.keys()) {
    if (!factories.includes(key)) {
      themeInstances.delete(key);
    }
  }
  return factories.map((factory) => {
    let instance = themeInstances.get(factory);
    if (!instance) {
      instance = factory();
      themeInstances.set(factory, instance);
    }
    return instance;
  });
});

const theme = computed(() => props.theme || 'light');

const colorScheme = ref<ThemeColorScheme>('light');

const genuiConfig = computed(() => ({
  colorScheme: colorScheme.value,
  id: props.id,
}));

provide(GENUI_CONFIG, genuiConfig);

const internalMaterials = {};
watch(() => props.materials, (newVal) => {
  Object.assign(internalMaterials, newVal);
}, { immediate: true });

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

const ThemeRoots = defineComponent({
  name: 'ThemeRoots',
  props: {
    roots: { type: Array as PropType<Component[]>, required: true },
  },
  setup(props, { slots }) {
    return () => {
      const children = slots.default?.() ?? [];
      return props.roots.reduceRight<VNode | VNode[]>(
        (acc, root) => h(root, {}, () => acc),
        children,
      );
    };
  },
});

const themeRoots = shallowRef<Component[]>([]);

let applied: IThemeApplyResult[] = [];

function clearTheme() {
  const pending = applied;
  applied = [];
  pending.forEach((item) => item.dispose());
}

watch(
  () => [materialThemes.value, theme.value, mediaTheme.value, props.id] as const,
  ([apis, themeValue, systemColorScheme]) => {
    clearTheme();
    const results: IThemeApplyResult[] = [];
    const roots: Component[] = [];

    for (const api of apis) {
      const result = api.apply(themeValue, { systemColorScheme });
      if (result.Root) {
        roots.push(result.Root as Component);
      }
      results.push(result);
      applied.push(result);
    }

    themeRoots.value = roots;
    colorScheme.value =
      results.find((result) => result.descriptor.colorScheme)?.descriptor.colorScheme ??
      (themeValue === 'auto'
        ? systemColorScheme
        : themeValue === 'dark'
          ? 'dark'
          : 'light');
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  clearTheme();
  themeInstances.clear();
});

const robotProviderProps = computed(() => ({
  colorMode: colorScheme.value,
  targetElement: `#${props.id}`,
}));
</script>

<template>
  <div :id="props.id" class="tg-config-provider">
    <ThemeProvider v-bind="robotProviderProps">
      <ThemeRoots :roots="themeRoots">
        <slot />
      </ThemeRoots>
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
