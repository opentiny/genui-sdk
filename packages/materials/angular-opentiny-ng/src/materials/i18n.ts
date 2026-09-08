import type { IMaterialsI18n } from '@opentiny/genui-sdk-core';

const ZH_CN = 'zh_CN';
const TI_ZH_CN = 'zh-CN';
const TI_EN_US = 'en-US';

type TiLocaleHost = Window & { tiLocale?: string };

/**
 * TinyNG stores locale on window.tiLocale (same as TiLocale.setLocale).
 * Writing the global keeps Vue playground and the Angular CE bundle in sync
 * without requiring a shared @opentiny/ng-locale module instance.
 */
export const materialsI18n: IMaterialsI18n = {
  setLocale(locale: string) {
    const lang = locale.trim() === ZH_CN ? TI_ZH_CN : TI_EN_US;
    if (typeof window !== 'undefined') {
      (window as TiLocaleHost).tiLocale = lang;
    }
  },
};
