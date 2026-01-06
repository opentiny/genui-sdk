import zhCN from './zh.json';
import enUS from './en.json';

export type LocaleType = 'zh-CN' | 'en-US';

export interface I18n {
  [key: string]: string | I18n;
}

export type TranslateFunction = (key: string, params?: Record<string, any>) => string;

// 全局 i18n 实例管理器
let globalI18nInstance: TranslateFunction | null = null;

/**
 * 设置全局 i18n 实例（由 ConfigProvider 调用）
 */
export function setI18nInstance(t: TranslateFunction) {
  globalI18nInstance = t;
}

/**
 * 获取全局 i18n 实例
 */
export function getI18nInstance(): TranslateFunction | null {
  return globalI18nInstance;
}

export function t(key: string, params?: Record<string, any>) {
  const globalT = getI18nInstance();
  const t: TranslateFunction = globalT || createTranslateFunction('zh-CN');
  
  return t(key, params);
}

export function useI18n() {
  const globalT = getI18nInstance();
  const t: TranslateFunction = globalT || createTranslateFunction('zh-CN');
  return { t };
}

export const defaultMessages: Record<LocaleType, I18n> = {
  'zh-CN': zhCN as I18n,
  'en-US': enUS as I18n,
};

export function createTranslateFunction(locale: LocaleType, extra?: Partial<Record<LocaleType, I18n>> | I18n): TranslateFunction {
  const base = defaultMessages[locale] || defaultMessages['zh-CN'];
  
  // 如果 extra 是包含语言键的对象（如 { 'zh-CN': {...}, 'en-US': {...} }）
  let extraI18n: I18n | undefined;
  if (extra) {
    // 检查是否是语言键对象（包含 'zh-CN' 或 'en-US' 键）
    if (typeof extra === 'object' && !Array.isArray(extra) && ('zh-CN' in extra || 'en-US' in extra)) {
      extraI18n = (extra as Partial<Record<LocaleType, I18n>>)[locale];
    } else {
      // 否则当作普通的 I18n 对象处理（向后兼容）
      extraI18n = extra as I18n;
    }
  }
  
  const merged = deepMerge(base, extraI18n || {});

  return (key: string, params?: Record<string, any>): string => {
    const parts = key.split('.');
    let cur: any = merged;

    for (const p of parts) {
      if (cur == null) {
        return key;
      }
      cur = cur[p];
    }

    if (typeof cur === 'string') {
      // 支持参数替换，例如 {text} -> 实际值
      if (params) {
        return cur.replace(/\{(\w+)\}/g, (match, paramKey) => {
          return params[paramKey] !== undefined ? String(params[paramKey]) : match;
        });
      }
      return cur;
    }

    return key;
  };
}

function deepMerge(target: any, source: any): any {
  if (!source) {
    return target;
  }

  const result: any = Array.isArray(target) ? [...target] : { ...target };

  Object.keys(source).forEach((key) => {
    const srcVal = source[key];
    const tgtVal = (target || {})[key];

    if (srcVal && typeof srcVal === 'object' && !Array.isArray(srcVal)) {
      result[key] = deepMerge(tgtVal || {}, srcVal);
    } else {
      result[key] = srcVal;
    }
  });

  return result;
}


