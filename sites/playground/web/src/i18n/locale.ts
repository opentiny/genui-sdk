export enum Locale {
  ZhCN = 'zh_CN',
  EnUS = 'en_US',
}

export function isSupportedLocale(value: unknown): value is Locale {
  return Object.values(Locale).includes(value as Locale);
}
