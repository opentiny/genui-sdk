import { applyMaterialsLocale } from '@opentiny/genui-sdk-core';
import { materialsI18n as angularMaterialsI18n } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/i18n';
import { Locale } from './locale';

/** Sync host document lang + TinyNG (Angular CE is outside Vue GenuiConfigProvider). */
export function syncComponentLocales(lang: string): void {
  document.documentElement.lang = lang === Locale.ZhCN ? 'zh-CN' : 'en';
  applyMaterialsLocale({ i18n: angularMaterialsI18n }, lang);
}
