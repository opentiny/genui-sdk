import { setLocale as setAngularMaterialsLocale } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/i18n';
import { Locale } from './locale';

/** 同步宿主文档与 TinyNG 的语言环境；Angular CE 位于 Vue GenuiConfigProvider 之外。 */
export function syncComponentLocales(lang: string): void {
  document.documentElement.lang = lang === Locale.ZhCN ? 'zh-CN' : 'en';
  setAngularMaterialsLocale(lang);
}
