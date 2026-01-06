import { getComponent, iconMap } from './material-getter';
import { newFn } from './parser-utils';
// import { renderDefault } from '../renderer';
import { Notify } from './notify';
import { isOnEvent } from './event-utils';
const [JS_EXPRESSION, JS_FUNCTION] = ['JSExpression', 'JSFunction'];

function renderDefault(schema: any, scope: any, parent: any) {
  return null; // TODO: not support yet
}

function toOnEventName(eventName: string) {
  return `on${eventName.charAt(0).toUpperCase() + eventName.slice(1)}`;
}

const isJSSlot = (data: any) => {
  return data && data.type === 'JSSlot';
};

const isJSExpression = (data: any) => {
  return data && data.type === 'JSExpression';
};

const isJSFunction = (data: any) => {
  return data && data.type === 'JSFunction';
};

const isJSResource = (data: any) => {
  return data && data.type === 'JSResource';
};

const isString = (data: any) => {
  return typeof data === 'string';
};

const isArray = (data: any) => {
  return Array.isArray(data);
};

const isFunction = (data: any) => {
  return typeof data === 'function';
};

const isObject = (data: any) => {
  return typeof data === 'object';
};

// 判断是否是状态访问器
const isStateAccessor = (stateData: any) =>
  stateData?.accessor?.getter?.type === 'JSFunction' ||
  stateData?.accessor?.setter?.type === 'JSFunction';

const transformJSX = (code: string) => {
  // todo: 实现
  return code;
};
const parseExpression = (data: any, scope: any, ctx: any, isJsx = false) => {
  try {
    const mergeScope = {
      ...scope,
      slotScope: scope,
    };
    let expression = isJsx ? transformJSX(data.value) : data.value;
    let params = {};
    if (data.params) {
      params = data.params.reduce((acc: Record<string, any>, paramName: string) => {
        acc[paramName] = mergeScope[paramName];
        return acc;
      }, {});
      expression = `(e) => {(${expression}).call(this, e, ${data.params.join(',')})}`;
    }
    return newFn('$scope', `with($scope || {}) { return ${expression} }`).call(ctx, {
      ...mergeScope,
      ...params,
    });
  } catch (err) {
    // 解析抛出异常，则再尝试解析 JSX 语法。如果解析 JSX 语法仍然出现错误，isJsx 变量会确保不会再次递归执行解析
    if (!isJsx) {
      return parseExpression(data, scope, ctx, true);
    }
    return undefined;
  }
};
// 解析函数字符串结构
const parseFunctionString = (fnStr: string) => {
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

// 解析JSX字符串为可执行函数
const parseJSXFunction = (data: any, ctx: any) => {
  try {
    const newValue = transformJSX(data.value);
    const fnInfo = parseFunctionString(newValue);
    if (!fnInfo) throw Error('函数解析失败，请检查格式。示例：function fnName() { }');

    return newFn(...fnInfo.params, fnInfo.body).bind({
      ...ctx,
      getComponent,
    });
  } catch (error) {
    Notify({
      type: 'warning',
      title: '函数声明解析报错',
      message: (error as Error)?.message || '函数声明解析报错，请检查语法',
    });

    return newFn();
  }
};

const isFunctionString = (str: string) => {
  if (typeof str !== 'string') {
    return false;
  }

  return str.includes('function') || str.includes('=>');
};
const parseJSFunction = (data: any, scope: any, ctx: any) => {
  try {
    if (!isFunctionString(data.value)) {
      return;
    }

    return newFn('$scope', `with($scope || {}) { return (${data.value}).bind(this) }`).call(ctx, {
      ...scope,
    });
  } catch (error) {
    return parseJSXFunction(data, ctx);
  }
};

const parseList: {
  type: (data: any) => boolean;
  parseFunc: (data: any, scope: any, ctx: any) => any;
}[] = [];
export function parseData(data: any, scope: any, ctx: any) {
  let res = data;
  parseList.some((item) => {
    if (item.type(data)) {
      res = item.parseFunc(data, scope, ctx);

      return true;
    }

    return false;
  });

  return res;
}

export const parseCondition = (condition: any, scope: any, ctx: any) => {
  // eslint-disable-next-line no-eq-null
  return condition == null ? true : parseData(condition, scope, ctx);
};

export const parseLoopArgs = (_loop: any) => {
  if (_loop) {
    const { item, index, loopArgs = '' } = _loop;
    const body = `return {${loopArgs[0] || 'item'}: item, ${loopArgs[1] || 'index'} : index }`;
    return newFn('item,index', body)(item, index);
  }
  return undefined;
};
export const getIcon = (name: string) => iconMap[name]?.() || '';
const parseObjectData = (data: any, scope: any, ctx: any) => {
  if (!data) {
    return data;
  }

  // 如果是状态访问器,则直接解析默认值
  if (isStateAccessor(data)) {
    return parseData(data.defaultValue, scope, ctx);
  }

  // 解析通过属性传递icon图标组件
  if (data.componentName === 'Icon') {
    return getIcon(data.props.name);
  }
  const res: Record<string, any> = {};
  Object.entries(data).forEach(([key, value]) => {
    // 如果是插槽则需要进行特殊处理
    if (key === 'slot' && (value as any)?.name) {
      res[key] = (value as any).name;
    } else {
      res[key] = parseData(value, scope, ctx);
    }
  });

  const propsEntries = Object.entries(data);
  const modelValue = propsEntries.find(
    ([_key, value]: [string, any]) => value?.type === JS_EXPRESSION && value?.model === true,
  );
  const hasUpdateModelValue = propsEntries.find(
    ([key]) => isOnEvent(key) && key === toOnEventName(`${modelValue?.[0]}Change`), // 适配ng双向绑定
  );

  if (modelValue && !hasUpdateModelValue) {
    // 添加 onUpdate:modelKey 事件
    res[toOnEventName(`${modelValue[0]}Change`)] = parseData(
      {
        type: JS_FUNCTION,
        value: `(value) => ${(modelValue[1] as any).value}=value`,
      },
      scope,
      ctx,
    );
  }

  return res;
};

const parseString = (data: any) => {
  return data.trim();
};

const parseArray = (data: any, scope: any, ctx: any) => {
  return data.map((item: any) => parseData(item, scope, ctx));
};

const parseFunction = (data: any, scope: any, ctx: any) => {
  return data.bind(ctx);
};

const parseJSSlot = (data: any, scope: any) => {
  return ($scope: any) => renderDefault(data.value, { ...scope, ...$scope }, data);
};

parseList.push(
  ...[
    {
      type: isJSExpression,
      parseFunc: parseExpression,
    },
    {
      type: isJSFunction,
      parseFunc: parseJSFunction,
    },
    {
      type: isJSResource,
      parseFunc: parseExpression,
    },
    {
      type: isJSSlot,
      parseFunc: parseJSSlot,
    },
    {
      type: isString,
      parseFunc: parseString,
    },
    {
      type: isArray,
      parseFunc: parseArray,
    },
    {
      type: isFunction,
      parseFunc: parseFunction,
    },
    {
      type: isObject,
      parseFunc: parseObjectData,
    },
  ],
);
