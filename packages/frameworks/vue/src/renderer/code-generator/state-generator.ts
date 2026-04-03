/**
 * Copyright (c) 2023 - present TinyEngine Authors.
 * Copyright (c) 2023 - present Huawei Cloud Computing Technologies Co., Ltd.
 *
 * Use of this source code is governed by an MIT-style license.
 *
 * THE OPEN SOURCE SOFTWARE IN THIS PRODUCT IS DISTRIBUTED IN THE HOPE THAT IT WILL BE USEFUL,
 * BUT WITHOUT ANY WARRANTY, WITHOUT EVEN THE IMPLIED WARRANTY OF MERCHANTABILITY OR FITNESS FOR
 * A PARTICULAR PURPOSE. SEE THE APPLICABLE LICENSES FOR MORE DETAILS.
 *
 */

import { UNWRAP_QUOTES, JS_EXPRESSION, JS_FUNCTION, JS_I18N, JS_RESOURCE, JS_SLOT } from './constants';
import { generateJSXTemplate } from './template-generator';

const { start, end } = UNWRAP_QUOTES;

/** 解析函数字符串，提取 async/参数/函数体信息。 */
const getFunctionInfo = (fnStr) => {
  const fnRegexp = /(async)?.*?(\w+) *\(([\s\S]*?)\) *\{([\s\S]*)\}/;
  const result = fnRegexp.exec(fnStr);
  if (result) {
    return {
      type: result[1] || '',
      name: result[2],
      params: result[3]
        .split(',')
        .map((item) => item.trim())
        .filter((item) => Boolean(item)),
      body: result[4],
    };
  }
  return null;
};

/** 反序列化表达式占位符，恢复原始表达式内容。 */
export const unwrapExpression = (slotsValue) =>
  slotsValue.replace(new RegExp(`"${start}(.*?)${end}"`, 'g'), (match, p1) =>
    p1.replace(/\\"/g, '"').replace(/\\r\\n|\\r|\\n/g, ''),
  );

export const strategy = {
  [JS_EXPRESSION]: ({ value, computed }) => {
    if (computed) {
      return `${start}vue.computed(${value.replace(/this\./g, '')})${end}`;
    }

    return `${start}${value.replace(/this\./g, '')}${end}`;
  },

  [JS_FUNCTION]: ({ value }) => {
    const info = getFunctionInfo(value);
    if (!info) {
      // 函数字符串不符合预期格式时，避免空值解构抛 TypeError。
      // 尽可能将原始 value 当作表达式包裹，交由上层 unwrapExpression 处理占位符恢复。
      const raw = typeof value === 'string' ? value.replace(/this\./g, '') : '';
      return `${start}${raw}${end}`;
    }

    const { type, params, body } = info;
    const inlineFunc = `${type} (${params.join(',')}) => { ${body.replace(/this\./g, '')} }`;

    return `${start}${inlineFunc}${end}`;
  },

  [JS_I18N]: ({ key }) => `${start}t("${key}")${end}`,

  [JS_RESOURCE]: ({ value }, description) => {
    const resourceType = value.split('.')[1];

    if (Object.prototype.hasOwnProperty.call(description.jsResource, resourceType)) {
      description.jsResource[resourceType] = true;
    }

    return `${start}${value.replace(/this\./g, '')}${end}`;
  },

  [JS_SLOT]: ({ value = [], params = ['row'] }, description, rootState) => {
    description.hasJSX = true;

    const slotValues = value.map((item) => generateJSXTemplate(item, description, rootState)).join('');

    // 默认解构参数 row，因为jsx slot 必须有第二个参数 h
    return `${start}({ ${params.join(',')} }, h) => ${slotValues}${end}`;
  },
};

/**
 * 对协议中的类型做特殊处理，相应转换为字符串
 * @param {*} current 原始对象
 * @param {*} prop 当前对象的属性字段
 * @param {*} description 记录使用到的外部资源
 */
/** 将协议内置类型转换为可执行表达式字符串。 */
export const transformType = (current, prop, description, rootState) => {
  const builtInTypes = [JS_EXPRESSION, JS_FUNCTION, JS_I18N, JS_RESOURCE, JS_SLOT];
  const { type } = current[prop] || {};

  if (builtInTypes.includes(type)) {
    description.internalTypes.add(type);
    current[prop] = strategy[type](current[prop], description, rootState);
  }
};

/** 深度遍历 state，处理内置类型节点。 */
export const traverseState = (current, description, rootState = current) => {
  if (typeof current !== 'object') return;

  if (Array.isArray(current)) {
    current.forEach((prop) => traverseState(prop, description, rootState));
  } else if (typeof current === 'object') {
    Object.keys(current || {}).forEach((prop) => {
      if (Object.prototype.hasOwnProperty.call(current, prop)) {
        // 解析协议中的类型
        // transformType 会在遇到 JS_SLOT 时触发 generateJSXTemplate；需要保证其能拿到根 state
        transformType(current, prop, description, rootState);
        traverseState(current[prop], description, rootState);
      }
    });
  }
};
