import { capitalize, hyphenate } from '@vue/shared';
import { isOn, toEventKey } from './event-binding';
import { traverseState, unwrapExpression } from './state-generator';
import { JS_FUNCTION, JS_RESOURCE, JS_SLOT } from './constants';

/**
 * 递归处理子节点，生成模板片段。
 */
const recurseChildren = (children, state, description, result) => {
  if (Array.isArray(children)) {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const subTemplate = children.map((child) => generateTemplate(child, state, description)).join('');
    result.push(subTemplate);
  } else if (children?.type === 'JSExpression') {
    result.push(`{{ ${children.value.replace(/this\.(props\.)?/g, '')} }}`);

    Object.keys(description.jsResource).forEach((key) => {
      description.jsResource[key] = description.jsResource[key] || children.value.includes(`.${key}.`);
    });
  } else if (children?.type === 'i18n') {
    result.push(`{{ t('${children.key}') }}`);
  } else {
    result.push(children || '');
  }

  return result;
};

/**
 * 处理节点 props，转换为模板属性字符串数组。
 */
export const handleBinding = (props, attrsArr, description, state) => {
  Object.entries(props as Record<string, any>).forEach(([key, item]) => {
    // 处理 className
    if (key === 'className') {
      key = 'class';
    }

    // 处理 slot
    if (key === 'slot') {
      let slot = handleSlotBinding(item);

      return attrsArr.push(slot);
    }

    const propType = item?.type || 'literal';

    // 事件名，协议约定以 on 开头的 camelCase 形式，template 中使用 kebab-case 形式
    if (isOn(key)) {
      const eventBinding = handleEventBinding(key, item);

      return attrsArr.push(eventBinding);
    }

    if (propType === 'literal') {
      return handleLiteralBinding({ key, item, attrsArr, description, state });
    }

    if (propType === 'JSExpression') {
      // 支持带参数的 v-model
      if (item.model) {
        const modelArgs = item.model?.prop ? `:${item.model.prop}` : '';
        return attrsArr.push(`v-model${modelArgs}="${item.value.replace(/this\.(props\.)?/g, '')}"`);
      }

      // expression 使用 v-bind 绑定
      return attrsArr.push(`:${key}="${item.value.replace(/this\.(props\.)?/g, '')}"`);
    }

    return attrsArr;
  });
};

/**
 * 处理 slot 协议，转换为 Vue 插槽绑定语法。
 */
export const handleSlotBinding = (item) => {
  const { name, params } = item;
  let slot = `#${name || item}`;

  if (Array.isArray(params)) {
    slot = `#${name}="{ ${params.join(',')} }"`;
  } else if (typeof params === 'string') {
    slot = `#${name}="${params}"`;
  }
  return slot;
};

export const handleEventBinding = (key, item) => {
  const eventKey = toEventKey(key);
  let eventBinding = '';

  // vue 事件绑定，仅支持：内联事件处理器 or 方法事件处理器（绑定方法名或对某个方法的调用）
  if (item?.type === 'JSExpression') {
    const eventHandler = item.value.replace(/this\.(props\.)?/g, '');

    // Vue Template 中，为事件处理函数传递额外的参数时，需要使用内联箭头函数
    if (item.params?.length) {
      const extendParams = item.params.join(',');
      eventBinding = `@${eventKey}="(...eventArgs) => ${eventHandler}(eventArgs, ${extendParams})"`;
    } else {
      eventBinding = `@${eventKey}="${eventHandler}"`;
    }
  }

  return eventBinding;
};

/**
 * 生成不重复的临时变量名。
 */
const avoidDuplicateString = (existings, str) => {
  let result = str;
  let suffix = 1;

  while (existings.includes(result)) {
    result = `${str}${suffix}`;
    suffix++;
  }

  return result;
};

/**
 * 处理字面量/对象表达式并生成绑定语法。
 */
const handleLiteralBinding = ({ key, item, attrsArr, description, state }) => {
  // 字面量
  // string 直接静态绑定
  if (typeof item === 'string') return attrsArr.push(`${key}="${item.replace(/"/g, '&quot;')}"`);

  // 复杂类型（not null），解析协议（如：i18n）后，使用 v-bind 绑定，注意：双引号与单引号的处理
  if (typeof item === 'object') {
    traverseState(item, description);
    const canotBind =
      description.internalTypes.has(JS_FUNCTION) ||
      description.internalTypes.has(JS_RESOURCE) ||
      description.internalTypes.has(JS_SLOT);

    // 不能直接绑定的，新建临时变量，以 state 变量的形式绑定
    if (canotBind) {
      description.internalTypes = new Set();
      const valueKey = avoidDuplicateString(Object.keys(state), key);
      state[valueKey] = item;

      return attrsArr.push(`:${key}="state.${valueKey}"`);
    }
    const parsedValue = unwrapExpression(JSON.stringify(item)).replace(/props\./g, '');

    // 对象/数组在 v-bind 中是表达式：外层用单引号包住 attribute，
    // 这样表达式内部的双引号无需替换成 &quot;，避免生成不可读的 & quot; 片段。
    const safeExpr = parsedValue.replace(/'/g, '&#39;');
    return attrsArr.push(`:${key}='${safeExpr}'`);
  }

  // number/boolean/expression 使用 v-bind 绑定
  return attrsArr.push(`:${key}="${item}"`);
};

/**
 * 判断是否为空 template 插槽节点。
 */
const isEmptySlot = (componentName, children) => componentName === 'template' && !(children?.length || children?.type);

/**
 * 根据 schema 递归生成 Vue template 字符串。
 */
export const generateTemplate = (schema, state, description, isRootNode = false) => {
  const result = [];
  const { componentName, fileName, loop, loopArgs = ['item'], condition, props = {}, children } = schema;

  // 不生成空插槽，否则会影响插槽的默认内容
  if (isEmptySlot(componentName, children)) {
    return '';
  }

  let component = '';
  if (isRootNode) {
    component = 'div';
  } else {
    component = hyphenate(componentName || 'div');
    description.componentSet.add(componentName);
  }

  result.push(`\n<${component} `);

  const attrsArr = [];

  // 循环渲染 v-for, 循环数据支持：变量表达式、数组/对象字面量
  if (loop) {
    const loopData = loop.type
      ? loop.value.replace(/this\.(props\.)?/g, '')
      : JSON.stringify(loop).replace(/"/g, '&quot;');

    attrsArr.push(`v-for="(${loopArgs.join(',')}) in ${loopData}"`);
  }

  // 处理 condition, 条件渲染
  if (typeof condition === 'object' || typeof condition === 'boolean') {
    const conditionValue = condition?.type ? condition.value.replace(/this\.(props\.)?/g, '') : condition;
    const directive = condition?.kind || 'if';
    const conditionStr = directive === 'else' ? 'v-else' : `v-${directive}="${conditionValue}"`;

    attrsArr.push(conditionStr);
  }

  handleBinding(props, attrsArr, description, state);

  result.push(attrsArr.join(' '));

  // 处理 Void elements: 使用自闭合标签，如：<img />
  const VOID_ELEMENTS = ['img', 'input', 'br', 'hr', 'link'];
  if (VOID_ELEMENTS.includes(component)) {
    result.push(' />');
  } else {
    result.push('>');

    recurseChildren(children, state, description, result);

    result.push(`</${component}>`);
  }

  return result.join('');
};

export const generateJSXTemplate = (item, description) => {
  const result = [];
  const { componentName, fileName, props = {}, children, condition } = item;

  let component = '';
  component = componentName || item.component || 'div';
  description.componentSet.add(component);

  const attrsArr = [];

  // 处理 condition, 条件渲染
  if (condition) {
    const conditionValue = condition?.type ? condition.value.replace(/this\./g, '') : condition;
    result.push(`{ ${conditionValue} && `);
  }

  result.push(`<${component} `);

  handleBinding(props, attrsArr, description, {});

  result.push(attrsArr.join(' '));

  // 处理 Void elements: 使用自闭合标签，如：<img />
  const VOID_ELEMENTS = ['img', 'input', 'br', 'hr', 'link'];
  if (VOID_ELEMENTS.includes(component)) {
    result.push(' />');
  } else {
    result.push('>');

    if (Array.isArray(children)) {
      const subTemplate = children.map((child) => generateJSXTemplate(child, description)).join('');
      result.push(subTemplate);
    } else if (children?.type === 'JSExpression') {
      result.push(`{ ${children.value.replace(/this\./g, '')} }`);
    } else if (children?.type === 'i18n') {
      result.push(`{t('${children.key}')}`);
    } else {
      result.push(children || '');
    }

    result.push(`</${component}>`);
  }
  if (condition) {
    result.push(' }');
  }

  return result.join('');
};
