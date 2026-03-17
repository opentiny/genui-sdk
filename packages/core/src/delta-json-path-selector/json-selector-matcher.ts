export function findGroupSelector(restSelectors: string[]) {
  if (restSelectors.length === 1) {
    return restSelectors;
  }
  let continueFlag = true;
  let length = 1;
  for (let i = 1; continueFlag; i = i + 2) { // 默认两个>中间需要间隔有效字符, 暂不支持连续 >
    if (restSelectors[i] !== '>') {
      continueFlag = false;
      length = i;
    }
  }
  return restSelectors.slice(0, length);
}

function getObjectByKey(obj: any, key: string) {
  if (key === '$') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj[Number(key)];
  }
  return obj[key];
}

export function matchGroup(objectKey: string, objectValue: any, groupPath: string[], groupSelector: string[], deep = 0) {
  if (groupSelector.length === 1) {
    return matchSelector(objectKey, objectValue, groupSelector[0]);
  }

  if (!matchSelector(objectKey, objectValue, groupSelector[0])) {
    return false;
  }
  // tail recursion
  return matchGroup(groupPath[1], getObjectByKey(objectValue, groupPath[1]), groupPath.slice(1), groupSelector.slice(1), deep + 1);
}

const allAttrRegex = /\[[^\]]+\]/g
const attrWithValueRegex = /\[([^\]=~^$*]+)(=|\^=|\$=|\*=)([^\]]+)\]/g;
const attrWithoutOpRegex = /\[([^\]=~^$*]+)\]/g;
const pseudoRegex = /:([^:\s]+)/g;

export function matchSelector(objectKey: string, objectValue: any, selectorToken: string) {
  if (objectValue === undefined) {
    return false;
  }
  if (selectorToken === '*') {
    return true;
  }

  const selectorMatches = selectorToken.replace(allAttrRegex, '').replace(pseudoRegex, '').trim();
  if (selectorMatches && objectKey !== selectorMatches) {
    return false;
  }

  const attrMatches = [...selectorToken.matchAll(attrWithValueRegex)];
  if (attrMatches.length > 0) {
    if (!objectValue) {
      return false;
    }
    for (const [, key, op, val] of attrMatches) {
      const nodeVal = String(getObjectByKey(objectValue, key) ?? '');
      if (
        (op === '=' && nodeVal !== val) ||
        (op === '^=' && !nodeVal.startsWith(val)) ||
        (op === '$=' && !nodeVal.endsWith(val)) ||
        (op === '*=' && !nodeVal.includes(val))
      ) {
        return false;
      }
    }
  }

  const pureAttrMatches = [...selectorToken.replace(attrWithValueRegex, '').matchAll(attrWithoutOpRegex)];
  if (pureAttrMatches.length > 0) {
    if (!objectValue) {
      return false;
    }
    for (const [, key] of pureAttrMatches) {
      if (getObjectByKey(objectValue, key) === undefined) {
        return false;
      }
    }
  }

  const isEmpty = (value: any) =>  {
   return (typeof value === 'object' && Object.keys(value || {}).length === 0)
    || (Array.isArray(value) && value.length === 0) 
    || (typeof value === 'string' && value.trim() === '');
  }
  const isObject = (value: any) => typeof value === 'object' && value !== null;
  const isArray = (value: any) => Array.isArray(value);
  const isString = (value: any) => typeof value === 'string';
  const isNumber = (value: any) => typeof value === 'number';
  const isBoolean = (value: any) => typeof value === 'boolean';
  const isNull = (value: any) => value === null;
  const pseudoMatches = [...selectorToken.matchAll(pseudoRegex)];
  if (pseudoMatches.length > 0) {
    for (const [, pseudo] of pseudoMatches) {
      // tree
      if (pseudo === 'empty') {

        if (!isEmpty(objectValue)) {
          return false;
        }
      }
      // type
      if (pseudo === 'object') {
        if (!isObject(objectValue)) {
          return false;
        }
      }
      if (pseudo === 'array') {
        if (!isArray(objectValue)) {
          return false;
        }
      }
      if (pseudo === 'string') {
        if (!isString(objectValue)) {
          return false;
        }
      }
      if (pseudo === 'number') {
        if (!isNumber(objectValue)) {
          return false;
        }
      }
      if (pseudo === 'boolean') {
        if (!isBoolean(objectValue)) {
          return false;
        }
      }
      if (pseudo === 'null') {
        if (!isNull(objectValue)) {
          return false;
        }
      }
    }
  }
  return true;
}

export function jsonSelectorMatcher(json: any, selector: string, lastDeltaKeys: string) {
  const jsonPath = ['$', ...lastDeltaKeys.split('.')];
  const selectorSection = selector.split(/\s+/); // TODO: 支持无空格，待支持连续 > 无需补充 *
  let objectValue = json;
  let jIndex = 0, sIndex = 0; 

  while (jIndex < jsonPath.length && sIndex < selectorSection.length) {
    const objectKey = jsonPath[jIndex];
    objectValue = getObjectByKey(objectValue, objectKey);
    const groupSelector = findGroupSelector(selectorSection.slice(sIndex));

    if (matchGroup(objectKey, objectValue, jsonPath.slice(jIndex), groupSelector.filter((s) => s !== '>'))) {
      jIndex = jIndex + groupSelector.filter((s) => s !== '>').length;
      sIndex = sIndex + groupSelector.length;
    } else {
      jIndex++;
    }
  }
  
  return {
    isMatch: sIndex === selectorSection.length,
    matchPath: sIndex === selectorSection.length ? jsonPath.slice(1, jIndex).join('.') : '',
  };
}
