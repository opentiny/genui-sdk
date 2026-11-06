import type { ReactNode } from 'react';
import { ConfigProvider, theme as antdTheme } from 'antd';
import type { Locale } from 'antd/es/locale';
import zhCNModule from 'antd/locale/zh_CN.js';
import enUSModule from 'antd/locale/en_US.js';
import esESModule from 'antd/locale/es_ES.js';
import frFRModule from 'antd/locale/fr_FR.js';
import ptBRModule from 'antd/locale/pt_BR.js';
import type {
  ILocaleDescriptor,
  IThemeDescriptor,
  MaterialsRuntimeFactory,
  ThemeColorScheme,
} from '@opentiny/genui-sdk-core';

function resolveLocaleModule(localeModule: Locale | { default: Locale }): Locale {
  return (localeModule as { default?: Locale }).default ?? (localeModule as Locale);
}

const themes: IThemeDescriptor[] = [
  { id: 'light', colorScheme: 'light' },
  { id: 'dark', colorScheme: 'dark' },
];

const locales: Array<ILocaleDescriptor & { pack: Locale }> = [
  { id: 'zh_CN', pack: resolveLocaleModule(zhCNModule) },
  { id: 'en_US', pack: resolveLocaleModule(enUSModule) },
  { id: 'es_ES', pack: resolveLocaleModule(esESModule) },
  { id: 'fr_FR', pack: resolveLocaleModule(frFRModule) },
  { id: 'pt_BR', pack: resolveLocaleModule(ptBRModule) },
];

function resolveThemeDescriptor(theme: string, systemColorScheme: ThemeColorScheme): IThemeDescriptor {
  return (
    themes.find((item) => item.id === theme) ?? {
      id: systemColorScheme,
      colorScheme: systemColorScheme,
    }
  );
}

function resolveLocale(locale: string): ILocaleDescriptor & { pack: Locale } {
  return locales.find((item) => item.id === locale) ?? locales[0];
}

/**
 * @experimental 实验特性，API 可能在后续版本中发生变更。
 */
export const runtimeFactory: MaterialsRuntimeFactory = () => {
  let colorScheme: ThemeColorScheme = 'light';
  let locale: Locale = locales[0].pack;

  const RuntimeRoot = ({ children }: { children?: ReactNode }) => (
    <ConfigProvider
      theme={{
        algorithm: colorScheme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      }}
      locale={locale}
    >
      {children}
    </ConfigProvider>
  );

  return {
    themes,
    locales,
    apply(config, context) {
      const themeDescriptor = resolveThemeDescriptor(config.theme, context.systemColorScheme);
      const localeDescriptor = resolveLocale(config.locale);

      colorScheme = themeDescriptor.colorScheme ?? 'light';
      locale = localeDescriptor.pack;

      return {
        theme: themeDescriptor,
        locale: localeDescriptor,
        root: RuntimeRoot,
      };
    },
  };
};
