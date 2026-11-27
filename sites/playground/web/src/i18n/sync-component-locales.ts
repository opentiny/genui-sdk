import { Locale } from './locale';

/** 同步宿主文档 lang；TinyNG 语言由 Angular GenuiConfigProvider 的 locale 输入处理。 */
export function syncComponentLocales(lang: string): void {
  document.documentElement.lang = lang === Locale.ZhCN ? 'zh-CN' : 'en';
}
