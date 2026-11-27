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

/**
 * TinyNG 官方入口：TiLocale.setLocale 会写入 window.tiLocale（SSR 则写 global），属于全局状态。
 * 因此只在显式传入 `locale` 时切换；未传（`undefined`）时保持应用当前语言不变，
 * 避免只改 theme 的 ConfigProvider 把全局语言重置成 `zh_CN`。
 */
function setLocale(locale: string | undefined): ILocaleDescriptor | undefined {
  if (locale === undefined) {
    return undefined;
  }
  const current = resolveLocale(locale);
  TiLocale.setLocale(current.pack);
  return current;
}

/**
 * @experimental 实验特性，API 可能在后续版本中发生变更。
 */
export const runtimeFactory: MaterialsRuntimeFactory = () => {
  return {
    locales,
    apply(config) {
      return { locale: setLocale(config.locale) };
    },
  };
};
