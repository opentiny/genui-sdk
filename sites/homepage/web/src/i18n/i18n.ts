import { ref, reactive, readonly, UnwrapNestedRefs } from 'vue';
import {
  I18nInstance,
  I18nMessages,
  I18nOptions,
  I18nMessageObject,
  I18nTranslateParams,
} from './types';

export function createI18n(options: I18nOptions = {}): I18nInstance {
  const defaultOptions: Required<I18nOptions> = {
    locale: 'zh_CN',
    messages: {},
  };

  const config: Required<I18nOptions> = {
    ...defaultOptions,
    ...options,
    messages: { ...defaultOptions.messages, ...options.messages },
  };

  const locale = ref<string>(config.locale);

  const _messages = reactive<UnwrapNestedRefs<I18nMessages>>(
    structuredClone(config.messages) as UnwrapNestedRefs<I18nMessages>,
  );

  function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  function _deepMerge(target: I18nMessageObject, source: I18nMessageObject): I18nMessageObject {
    if (!isPlainObject(target)) {
      return structuredClone(source);
    }

    if (!isPlainObject(source)) {
      return structuredClone(target);
    }

    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const targetValue = target[key];
        const sourceValue = source[key];

        if (isPlainObject(targetValue) && isPlainObject(sourceValue)) {
          target[key] = _deepMerge(
            targetValue as I18nMessageObject,
            sourceValue as I18nMessageObject,
          );
        } else {
          target[key] = structuredClone(sourceValue);
        }
      }
    }

    return target;
  }

  function setLocale(lang: string): void {
    if (typeof lang !== 'string' || lang.trim() === '') {
      console.warn('语言标识必须是非空字符串！');
      return;
    }

    const trimmedLang = lang.trim();
    if (locale.value !== trimmedLang) {
      locale.value = trimmedLang;
    }
  }

  function mergeMessages(newMessages: I18nMessages, isCoverSameKey = false): void {
    if (typeof newMessages !== 'object' || newMessages === null) {
      console.warn('要合并的词条必须是合法对象！');
      return;
    }

    for (const lang in newMessages) {
      if (Object.prototype.hasOwnProperty.call(newMessages, lang)) {
        const newLangMessages = newMessages[lang];
        const existingLangMessages = _messages[lang];

        if (!existingLangMessages || isCoverSameKey) {
          _messages[lang] = structuredClone(newLangMessages) as I18nMessageObject;
        } else {
          _deepMerge(existingLangMessages, newLangMessages);
        }
      }
    }
  }

  function t(key: string, params: I18nTranslateParams = {}): string {
    if (typeof key !== 'string' || key.trim() === '') {
      return '';
    }

    const trimmedKey = key.trim();
    const currentLang = locale.value;
    const currentLangMessages = _messages[currentLang] || {};

    const rawText = trimmedKey.split('.').reduce((current: unknown, nextKey) => {
      if (current && typeof current === 'object' && nextKey in (current as object)) {
        return (current as Record<string, unknown>)[nextKey];
      }
      return trimmedKey;
    }, currentLangMessages as unknown);

    if (typeof rawText !== 'string') {
      return trimmedKey;
    }

    return rawText.replace(/\{(\w+)\}/g, (match, paramKey) => {
      return Object.prototype.hasOwnProperty.call(params, paramKey)
        ? String(params[paramKey])
        : match;
    });
  }

  return {
    locale,
    messages: readonly(_messages),
    setLocale,
    mergeMessages,
    t,
  };
}
