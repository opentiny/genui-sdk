import type { ILocaleDescriptor, MaterialsRuntimeFactory } from '@opentiny/genui-sdk-core';
import { TiLocale } from '@opentiny/ng';

const locales: Array<ILocaleDescriptor & { pack: string }> = [
  { id: 'zh_CN', pack: 'zh-CN' },
  { id: 'en_US', pack: 'en-US' },
  { id: 'es_US', pack: 'es-US' },
  { id: 'fr_FR', pack: 'fr-FR' },
  { id: 'pt_BR', pack: 'pt-BR' },
];

function resolveLocale(locale: string) {
  return locales.find((item) => item.id === locale) ?? locales[0];
}

/** TinyNG 官方入口：TiLocale.setLocale 会写入 window.tiLocale（SSR 则写 global）。 */
export function setLocale(locale: string): ILocaleDescriptor {
  const current = resolveLocale(locale);
  TiLocale.setLocale(current.pack);
  return current;
}

export const runtimeFactory: MaterialsRuntimeFactory = () => {
  return {
    locales,
    apply(config) {
      return { locale: setLocale(config.locale) };
    },
  };
};
