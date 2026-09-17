import type { MaterialsRuntimeFactory } from '@opentiny/genui-sdk-core';

const ZH_CN = 'zh_CN';
const TI_ZH_CN = 'zh-CN';
const TI_EN_US = 'en-US';

type TiLocaleHost = Window & { tiLocale?: string };

/**
 * TinyNG 将语言环境保存在 window.tiLocale，行为与 TiLocale.setLocale 一致。
 * 写入这个全局变量可以让 Vue playground 与 Angular CE bundle 保持同步，
 * 无需共享同一个 @opentiny/ng-locale 模块实例。
 */
export function setLocale(locale: string): void {
  const lang = locale.trim() === ZH_CN ? TI_ZH_CN : TI_EN_US;
  if (typeof window !== 'undefined') {
    (window as TiLocaleHost).tiLocale = lang;
  }
}

export const runtimeFactory: MaterialsRuntimeFactory = () => {
  return {
    apply(config) {
      setLocale(config.locale);
      return {};
    },
  };
};
