<script setup lang="ts">
import { ThemeProvider } from '@opentiny/tiny-robot';
import {
  type IMaterials,
  type IMaterialsTheme,
  type ThemeApplyContext,
  type ThemeApplyResult,
  type ThemeColorScheme,
  type ThemeRootProps,
  resolveColorSchemeFromApplied,
} from '@opentiny/genui-sdk-core';
import {
  watch,
  provide,
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
const rootInstances = shallowRef<unknown[]>([]);
const themeRootProps = ref<ThemeRootProps[]>([]);

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

function setRootInstance(index: number, instance: unknown) {
  const next = instance || undefined;
  if (rootInstances.value[index] === next) {
    return;
  }
  const arr = [...rootInstances.value];
  arr[index] = next;
  rootInstances.value = arr;
}

let applied: ThemeApplyResult[] = [];

function clearTheme() {
  const pending = applied;
  applied = [];
  pending.forEach((item) => item.dispose());
}

watch(
  () => [materialThemes.value, theme.value, mediaTheme.value, props.id, rootRef.value, rootInstances.value] as const,
  ([apis, themeValue, systemColorScheme, scopeId, root, instances]) => {
    clearTheme();
    const rootEl = resolveRootEl(root);
    const claimedScheme = apis
      .flatMap((api) => api.themes ?? [])
      .find((item) => item.id === themeValue)?.colorScheme;
    const next: { themes?: IMaterialsTheme['themes']; id: string }[] = [];
    const computedProps: ThemeRootProps[] = [];

    for (const [index, api] of apis.entries()) {
      const ctx = {
        scopeId,
        rootEl,
        systemColorScheme,
        colorScheme: claimedScheme,
        rootInstance: instances[index],
      };
      const result = api.apply(themeValue, ctx);
      computedProps[index] = result.props ?? {};
      applied.push(result);
      next.push({ themes: api.themes, id: result.id });
    }

    themeRootProps.value = computedProps;
    colorScheme.value = resolveColorSchemeFromApplied(next, systemColorScheme);
  },
  { immediate: true },
);

onBeforeUnmount(clearTheme);

const ThemeRoots = defineComponent({
  name: 'ThemeRoots',
  props: {
    roots: { type: Array as PropType<Component[]>, required: true },
    rootPropsList: { type: Array as PropType<ThemeRootProps[]>, required: true },
    onRootInstance: { type: Function as PropType<(index: number, instance: unknown) => void>, required: true },
  },
  setup(props, { slots }) {
    return () => {
      const children = slots.default?.() ?? [];
      if (!props.roots.length) {
        return children;
      }
      return props.roots.reduceRight<VNode | VNode[]>(
        (acc, root, index) =>
          h(root, { ...(props.rootPropsList[index] ?? {}), ref: (el) => props.onRootInstance(index, el) }, () => acc),
        children,
      );
    };
  },
});

const PassthroughRoot = defineComponent({
  name: 'PassthroughRoot',
  setup(_, { slots }) {
    return () => slots.default?.() ?? [];
  },
});

const themeRoots = computed<Component[]>(() =>
  materialThemes.value.map((api) => (api.Root ? (api.Root as Component) : PassthroughRoot)),
);

const robotProviderProps = computed(() => ({
  colorMode: colorScheme.value,
  targetElement: `#${props.id}`,
}));
</script>

<template>
  <div :id="props.id" class="tg-config-provider" ref="rootRef">
    <ThemeProvider v-bind="robotProviderProps">
      <ThemeRoots :roots="themeRoots" :root-props-list="themeRootProps" :on-root-instance="setRootInstance">
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
