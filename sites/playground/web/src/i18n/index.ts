import zhCN from './zh.json';
import enUS from './en.json';
import { useI18n } from '@opentiny/genui-sdk-vue';
import { isSupportedLocale, Locale } from './locale';

const LOCALE_STORAGE_KEY = 'GENUI_SDK_VUE_PLAYGROUND_LOCALE';

const globalI18n = useI18n();

globalI18n.mergeMessages({
  [Locale.ZhCN]: zhCN,
  [Locale.EnUS]: enUS,
});

const savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY)?.trim();
if (savedLocale && isSupportedLocale(savedLocale)) {
  globalI18n.setLocale(savedLocale);
}

const { setLocale: setLocaleInternal, t, locale, mergeMessages, messages } = globalI18n;

function setLocale(lang: string): void {
  const trimLang = lang.trim();
  setLocaleInternal(trimLang);
  localStorage.setItem(LOCALE_STORAGE_KEY, trimLang);
}

export { t, locale, setLocale, mergeMessages, messages, useI18n, Locale };
