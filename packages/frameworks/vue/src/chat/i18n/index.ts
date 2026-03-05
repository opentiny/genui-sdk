import zhCN from './zh.json';
import enUS from './en.json';
import { createI18n } from './i18n';

const globalI18n = createI18n({
  locale: 'zh_CN', // 默认语言
  messages: {
    'zh_CN': zhCN,
    'en_US': enUS,
  },
});

export const useI18n = () => {
  return globalI18n;
};

export * from './i18n.js';
export * from './types.js';
