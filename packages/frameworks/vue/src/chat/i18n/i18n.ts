import { ref, reactive, readonly, UnwrapNestedRefs } from 'vue';
import { I18nInstance, I18nMessages, I18nOptions, I18nMessageObject, I18nTranslateParams } from './types';
export function createI18n(options: I18nOptions = {}): I18nInstance {
  const defaultOptions: Required<I18nOptions> = {
    locale: 'zh_CN',
    messages: {}
  };

  const config: Required<I18nOptions> = {
    ...defaultOptions,
    ...options,
    messages: { ...defaultOptions.messages, ...options.messages }
  };

  const locale = ref<string>(config.locale);

  const _messages = reactive<UnwrapNestedRefs<I18nMessages>>(
    structuredClone(config.messages) as UnwrapNestedRefs<I18nMessages>
  );


  /**
   * @param target 目标对象（被合并的原有词条）
   * @param source 源对象（要新增的词条）
   * @returns 合并后的目标对象
   */
  function _deepMerge(
    target: I18nMessageObject,
    source: I18nMessageObject
  ): I18nMessageObject {
    if (typeof target !== 'object' || target === null) {
      return structuredClone(source);
    }

    if (typeof source !== 'object' || source === null) {
      return structuredClone(target);
    }

    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const targetValue = target[key];
        const sourceValue = source[key];

        if (
          typeof targetValue === 'object' &&
          typeof sourceValue === 'object' &&
          !Array.isArray(targetValue) &&
          !Array.isArray(sourceValue) &&
          targetValue !== null &&
          sourceValue !== null
        ) {
          target[key] = _deepMerge(
            targetValue as I18nMessageObject,
            sourceValue as I18nMessageObject
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

  /**
   * @param newMessages 新的多语言词条
   * @param isCoverSameKey 合并模式：false（默认）为深度合并，保留原有词条并更新相同 key；true 为完全替换，整个语言对象被新对象替换，原有词条会丢失
   */
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

  /**
   * @param key 词条键（如 'user.login.success'）
   * @param params 可选：插值参数对象
   * @returns 翻译后的文本（无匹配时返回原 key）
   */
  function t(key: string, params: I18nTranslateParams = {}): string {
    if (typeof key !== 'string' || key.trim() === '') {
      return '';
    }

    const trimmedKey = key.trim();
    const currentLang = locale.value;
    const currentLangMessages = _messages[currentLang] || {};

    // 步骤1：解析多级词条键，获取原始文本
    const rawText = trimmedKey.split('.').reduce((current: any, nextKey) => {
      return current?.[nextKey] || trimmedKey;
    }, currentLangMessages);

    // 步骤2：校验原始文本类型
    if (typeof rawText !== 'string') {
      return trimmedKey;
    }

    // 步骤3：参数插值替换（匹配 {变量名} 格式）
    return rawText.replace(/\{(\w+)\}/g, (match, paramKey) => {
      return params.hasOwnProperty(paramKey) ? String(params[paramKey]) : match;
    });
  }

  return {
    locale,
    messages: readonly(_messages),
    setLocale,
    mergeMessages,
    t
  };
}
