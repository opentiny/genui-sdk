import { UNWRAP_QUOTES } from './constants';

const hyphenateRE = /\B([A-Z])/g;
const onRE = /^on([A-Z]\w*)/;
const onUpdateRE = /^on(Update:\w+)/;
const { start, end } = UNWRAP_QUOTES;

export const capitalize = (str = ''): string => (str ? str.charAt(0).toUpperCase() + str.slice(1) : '');

export const hyphenate = (str: string): string => str.replace(hyphenateRE, '-$1').toLowerCase();

export const toEventKey = (str: string): string => {
  const strRemovedPrefix = str.replace(onRE, '$1');
  const isOnUpdate = onUpdateRE.test(str);
  return isOnUpdate
    ? strRemovedPrefix.charAt(0).toLowerCase() + strRemovedPrefix.slice(1)
    : hyphenate(strRemovedPrefix);
};

export const unwrapExpression = (value: string): string =>
  value.replace(new RegExp(`"${start}(.*?)${end}"`, 'g'), (match, p1) =>
    p1.replace(/\\"/g, '"').replace(/\\r\\n|\\r|\\n/g, ''),
  );

export const escapeDoubleQuotedAttr = (value: string): string => value.replace(/"/g, '&quot;');

