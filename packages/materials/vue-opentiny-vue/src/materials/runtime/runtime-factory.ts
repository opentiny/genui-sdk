import type { ILocaleDescriptor, IThemeDescriptor, MaterialsRuntimeFactory, ThemeColorScheme } from '@opentiny/genui-sdk-core';
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

function applyLocale(localeId: string): ILocaleDescriptor {
  const current = resolveLocale(localeId);
  tinyUse(current.pack);
  return current;
}

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
    root,
    apply(config, context) {
      const themeDescriptor = resolveThemeDescriptor(config.theme, context.systemColorScheme);
      theme.value = themeDescriptor.id;
      return { theme: themeDescriptor, locale: applyLocale(config.locale) };
    },
  };
};
