import zhCN from './zh.json';
import enUS from './en.json';
import { createI18n } from './i18n';

const globalI18n = createI18n({
  locale: 'zh_CN',
  messages: {
    zh_CN: zhCN,
    en_US: enUS,
  },
});

export const { t, locale, setLocale, mergeMessages, messages } = globalI18n;

export const useI18n = () => globalI18n;

export * from './i18n';
export * from './types';
