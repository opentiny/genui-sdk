import { Reactive, Ref, UnwrapNestedRefs } from "vue";

export type I18nMessageObject = {
  [key: string]: string | I18nMessageObject;
};

export type I18nMessages = {
  [lang: string]: I18nMessageObject;
};

export type I18nTranslateParams = {
  [key: string]: string | number | boolean;
};

export interface I18nOptions {
  locale?: string;
  messages?: I18nMessages;
}

export interface I18nInstance {
  locale: Ref<string>;
  messages: Readonly<Reactive<UnwrapNestedRefs<I18nMessages>>>;
  setLocale: (lang: string) => void;
  mergeMessages: (newMessages: I18nMessages, isCoverSameKey?: boolean) => void;
  t: (key: string, params?: I18nTranslateParams) => string;
}
