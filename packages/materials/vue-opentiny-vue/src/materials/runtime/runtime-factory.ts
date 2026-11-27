import {
  getSystemColorScheme,
  type ILocaleDescriptor,
  type IThemeDescriptor,
  type MaterialsRuntimeFactory,
  type ThemeColorScheme,
} from '@opentiny/genui-sdk-core';
import { use as tinyUse, zhCN as tinyZhCN, enUS as tinyEnUS, esLA as tinyEsLA, ptBR as tinyPtBR } from '@opentiny/vue-locale';
import { defineComponent, h, ref } from 'vue';
import RuntimeRoot from './RuntimeRoot.vue';

const themes: IThemeDescriptor[] = [
  { id: 'light', colorScheme: 'light' },
  { id: 'dark', colorScheme: 'dark' },
  { id: 'lite', colorScheme: 'light' },
];

const locales: Array<ILocaleDescriptor & { pack: unknown }> = [
  { id: 'zh_CN', pack: tinyZhCN },
  { id: 'en_US', pack: tinyEnUS },
  { id: 'es_LA', pack: tinyEsLA },
  { id: 'pt_BR', pack: tinyPtBR },
];

function resolveThemeDescriptor(theme: string, systemColorScheme: ThemeColorScheme): IThemeDescriptor {
  return (
    themes.find((item) => item.id === theme) ?? {
      id: systemColorScheme,
      colorScheme: systemColorScheme,
    }
  );
}

function resolveLocale(locale: string) {
  return locales.find((item) => item.id === locale) ?? locales[0];
}

/**
 * `@opentiny/vue-locale` 的 `use()` 是模块级全局状态，会影响整个宿主应用的语言。
 * 因此只在显式传入 `locale` 时切换；未传（`undefined`）时保持应用当前语言不变，
 * 避免没写 locale 的 ConfigProvider 把宿主语言重置成 `zh_CN`。
 */
function applyLocale(localeId: string | undefined): ILocaleDescriptor | undefined {
  if (localeId === undefined) {
    return undefined;
  }
  const current = resolveLocale(localeId);
  tinyUse(current.pack);
  return current;
}

/**
 * @experimental 实验特性，API 可能在后续版本中发生变更。
 */
export const runtimeFactory: MaterialsRuntimeFactory = () => {
  const theme = ref('light');
  const root = defineComponent({
    name: 'GenuiOpenTinyRuntimeRoot',
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
      return () => h(RuntimeRoot, { theme: theme.value, ...attrs }, slots);
    },
  });

  return {
    themes,
    locales,
    apply(config) {
      const themeDescriptor = resolveThemeDescriptor(config.theme, getSystemColorScheme());
      theme.value = themeDescriptor.id;
      return { theme: themeDescriptor, locale: applyLocale(config.locale), root };
    },
  };
};
