import { capitalize, hyphenate } from '@vue/shared'

const onRE = /^on([A-Z]\w*)/
const onUpdateRE = /^on(Update:\w+)/
export const thisBindRe = /this\.(props\.)?/g
export const thisPropsBindRe = /this\.(props\.)?/g
export const thisRegexp = /this\./g

/** 判断是否为 onXxx 事件属性。 */
export const isOn = (key) => onRE.test(key)
/** 判断是否为 onUpdate:xxx 双向绑定事件。 */
const isOnUpdate = (key) => onUpdateRE.test(key)

/** 字符串首字符转小写。 */
const lowerFirst = (str) => str[0].toLowerCase() + str.slice(1)

/**
 * 将输入字符串转换为 PascalCase 风格, 默认可转换 kebab-case/camelCase
 * @param {string} input 源字符串
 * @param {string} delimiter 定界符。默认使用连字符，以支持转换 kebab-case
 * @returns {string} PascalCase 风格的字符串
 */
const toPascalCase = (input, delimiter = '-') => input.split(delimiter).map(capitalize).join('')

/** 将协议事件名转换为 Vue 模板事件名。 */
export const toEventKey = (str) => {
  const strRemovedPrefix = str.replace(onRE, '$1')

  if (isOnUpdate(str)) {
    return lowerFirst(strRemovedPrefix)
  }

  return hyphenate(strRemovedPrefix)
}