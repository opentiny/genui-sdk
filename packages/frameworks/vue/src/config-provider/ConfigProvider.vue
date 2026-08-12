<script setup lang="ts">
import { ThemeProvider } from '@opentiny/tiny-robot';
import {
  type IMaterials,
  type IMaterialsTheme,
  type ThemeColorScheme,
  type ThemeDisposer,
} from '@opentiny/genui-sdk-core';
import {
  watch,
  provide,
  computed,
  ref,
  onBeforeUnmount,
  defineComponent,
  h,
  type Component,
  type PropType,
  type VNode,
} from 'vue';
import { I18nMessages, useI18n } from '../chat/i18n';
import { GENUI_I18N, GENUI_CONFIG, GENUI_MATERIALS } from './injection-tokens';
import { useMediaTheme } from './use-media-theme';

export interface ConfigProviderProps {
  theme?: string;
  id?: string;
  locale?: string;
  i18n?: I18nMessages;
  materials?: IMaterials;
}

const props = withDefaults(defineProps<ConfigProviderProps>(), {
  id: 'tiny-genui-config-provider',
  locale: 'zh_CN',
});

const i18n = useI18n();
provide(GENUI_I18N, i18n);

const { theme: mediaTheme } = useMediaTheme();

const materialThemes = computed<IMaterialsTheme[]>(() => {
  const theme = props.materials?.theme;
  if (!theme) {
    return [];
  }
  return Array.isArray(theme) ? theme : [theme];
});

const theme = computed(() => props.theme || 'light');

const colorScheme = computed<ThemeColorScheme>(() => {
  if (theme.value === 'auto') {
    return mediaTheme.value;
  }
  return theme.value === 'dark' ? 'dark' : 'light';
});

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

const rootRef = ref();

function resolveRootEl(value: unknown): HTMLElement | null {
  if (!value) {
    return null;
  }
  if (value instanceof HTMLElement) {
    return value;
  }
  const el = (value as { $el?: unknown }).$el;
  return el instanceof HTMLElement ? el : null;
}

let disposers: ThemeDisposer[] = [];

function clearTheme() {
  const pending = disposers;
  disposers = [];
  pending.forEach((dispose) => dispose());
}

watch(
  () => [materialThemes.value, theme.value, mediaTheme.value, props.id, rootRef.value] as const,
  ([apis, themeValue, systemColorScheme, scopeId, root]) => {
    clearTheme();
    const rootEl = resolveRootEl(root);
    for (const api of apis) {
      const dispose = api.apply(themeValue, { scopeId, rootEl, systemColorScheme });
      if (dispose) {
        disposers.push(dispose);
      }
    }
  },
  { immediate: true },
);

onBeforeUnmount(clearTheme);

const ThemeRoots = defineComponent({
  name: 'ThemeRoots',
  props: {
    roots: { type: Array as PropType<Component[]>, required: true },
  },
  setup(props, { slots }) {
    return () => {
      const children = slots.default?.() ?? [];
      if (!props.roots.length) {
        return children;
      }
      return props.roots.reduceRight<VNode | VNode[]>(
        (acc, root) => h(root, {}, () => acc),
        children,
      );
    };
  },
});

const themeRoots = computed(() =>
  materialThemes.value.map((api) => api.Root).filter((root): root is Component => Boolean(root)),
);

const robotProviderProps = computed(() => ({
  colorMode: colorScheme.value,
  targetElement: `#${props.id}`,
}));
</script>

<template>
  <div :id="props.id" class="tg-config-provider" ref="rootRef">
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
