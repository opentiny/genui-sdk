import { capitalize, hyphenate } from '@vue/shared'

const onRE = /^on([A-Z]\w*)/
const onUpdateRE = /^on(Update:\w+)/
export const thisRegexp = /this\./g

/** 判断是否为 onXxx 事件属性。 */
export const isOn = (key) => onRE.test(key)
/** 判断是否为 onUpdate:xxx 双向绑定事件。 */
const isOnUpdate = (key) => onUpdateRE.test(key)

/** 字符串首字符转小写。 */
const lowerFirst = (str) => str[0].toLowerCase() + str.slice(1)


/** 将协议事件名转换为 Vue 模板事件名。 */
export const toEventKey = (str) => {
  const strRemovedPrefix = str.replace(onRE, '$1')

  if (isOnUpdate(str)) {
    return lowerFirst(strRemovedPrefix)
  }

  return hyphenate(strRemovedPrefix)
}