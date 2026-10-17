import { UNWRAP_QUOTES } from './constants';

const hyphenateRE = /\B([A-Z])/g;
const onRE = /^on([A-Z]\w*)/;
const onUpdateRE = /^on(Update:\w+)/;
const { start, end } = UNWRAP_QUOTES;

/**
 * 落进模板/类体的名字白名单。这些名字是直接拼进产物文本的,不校验就能改坏属性表
 * 甚至注入新的属性/成员。
 */
export const MEMBER_NAME_RE = /^[A-Za-z_$][\w$]*$/;
export const PROPERTY_NAME_RE = /^(attr\.)?[A-Za-z_$][\w$-]*$/;
export const EVENT_NAME_RE = /^[A-Za-z][\w.:-]*$/;
export const STATIC_ATTR_RE = /^[A-Za-z_:][\w:.-]*$/;
export const CONTEXT_NAME_RE = /^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/;
export const TAG_NAME_RE = /^[a-z][\w-]*$/;

/** 脏名字压成合法成员名(my-fn → myFn) */
export const toMemberName = (name: string): string => {
  const camel = name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
  const cleaned = camel.replace(/[^\w$]/g, '');
  return /^[A-Za-z_$]/.test(cleaned) ? cleaned : `__${cleaned || 'x'}`;
};

export const capitalize = (str = ''): string => (str ? str.charAt(0).toUpperCase() + str.slice(1) : '');

export const hyphenate = (str: string): string => str.replace(hyphenateRE, '-$1').toLowerCase();

export const toEventKey = (str: string): string => {
  const strRemovedPrefix = str.replace(onRE, '$1');
  const isOnUpdate = onUpdateRE.test(str);
  return isOnUpdate
    ? strRemovedPrefix.charAt(0).toLowerCase() + strRemovedPrefix.slice(1)
    : strRemovedPrefix.toLowerCase();
};

export const unwrapExpression = (value: string): string =>
  value.replace(new RegExp(`"${start}(.*?)${end}"`, 'g'), (_full, p1) => JSON.parse(`"${p1}"`));


export const escapeTemplateLiteral = (text: string | undefined = ''): string =>
  text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
