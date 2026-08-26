<script setup lang="ts">
import { ThemeProvider } from '@opentiny/tiny-robot';
import {
  type IMaterials,
  type IMaterialsTheme,
  type ThemeApplyResult,
  type ThemeColorScheme,
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

let applied: ThemeApplyResult[] = [];

function clearTheme() {
  const pending = applied;
  applied = [];
  pending.forEach((item) => item.dispose());
}

watch(
  () => [materialThemes.value, theme.value, mediaTheme.value, props.id] as const,
  ([apis, themeValue, systemColorScheme]) => {
    clearTheme();
    // 原始 theme（含 auto）原样下发，物料用 ctx.systemColorScheme 自行解析
    const results: ThemeApplyResult[] = [];
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
    // 取第一个声明了 colorScheme 的落地结果（first-wins），否则跟随系统
    colorScheme.value =
      results.find((result) => result.descriptor.colorScheme)?.descriptor.colorScheme ??
      systemColorScheme;
  },
  { immediate: true },
);

onBeforeUnmount(clearTheme);

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
