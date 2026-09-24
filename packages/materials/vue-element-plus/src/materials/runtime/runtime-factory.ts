import type { ILocaleDescriptor, IThemeDescriptor, MaterialsRuntimeFactory, ThemeColorScheme } from '@opentiny/genui-sdk-core';
import { defineComponent, h, ref, shallowRef } from 'vue';
import type { Language } from 'element-plus/es/locale';
import elementPlusZhCn from 'element-plus/es/locale/lang/zh-cn';
import elementPlusEn from 'element-plus/es/locale/lang/en';
import RuntimeRoot from './RuntimeRoot.vue';

const themes: IThemeDescriptor[] = [
  { id: 'light', colorScheme: 'light' },
  { id: 'dark', colorScheme: 'dark' },
];

const locales: Array<ILocaleDescriptor & { pack: Language }> = [
  { id: 'zh_CN', pack: elementPlusZhCn },
  { id: 'en_US', pack: elementPlusEn },
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

export const runtimeFactory: MaterialsRuntimeFactory = () => {
  const theme = ref('light');
  const locale = shallowRef<Language>(elementPlusZhCn);
  const root = defineComponent({
    name: 'GenuiElementPlusRuntimeRoot',
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
      return () => h(RuntimeRoot, { theme: theme.value, locale: locale.value, ...attrs }, slots);
    },
  });

  function applyLocale(localeId: string): ILocaleDescriptor {
    const current = resolveLocale(localeId);
    locale.value = current.pack;
    return current;
  }

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
