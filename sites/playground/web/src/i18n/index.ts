import zhCN from './zh.json';
import enUS from './en.json';
import { useI18n } from '@opentiny/genui-sdk-vue';

const globalI18n = useI18n();

globalI18n.mergeMessages({
  zh_CN: zhCN,
  en_US: enUS,
});

export const { t, locale, setLocale, mergeMessages, messages } = globalI18n;

export { useI18n };
