import { getComponent } from './material-getter';
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
    const bindCtx = {
      ...(isJsx ? { getComponent: (name: string) => getComponent(name, ctx) } : {}),
      ...ctx,
    };
    return newFn('$scope', `with($scope || {}) { return ${expression} }`).call(bindCtx, {
      ...mergeScope,
      ...params,
    });
  } catch (err) {
    if (!isJsx) {
      return parseExpression(data, scope, ctx, true);
    }
    throw err;
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

export const generateFn = (innerFn: Function, context: any) => {
  return (...args: any[]) => {
    let result: any = null;
    try {
      result = innerFn.call(context, ...args);
    } catch (error) {
      Notify(
        {
          type: 'warning',
          title: `函数:${innerFn.name}执行报错`,
          message: (error as Error)?.message || `函数:${innerFn.name}执行报错，请检查语法`,
        },
        context,
      );
    }

    if (typeof result?.then === 'function') {
      result = new Promise((resolve) => {
        result.then(resolve).catch((error: Error) => {
          Notify(
            {
              type: 'warning',
              title: '异步函数执行报错',
              message: error?.message || '异步函数执行报错，请检查语法',
            },
            context,
          );
          resolve({
            result: [{}],
            page: { total: 1 },
          });
        });
      });
    }

    return result;
  };
};

const parseJSXFunction = (data: any, scope: any, ctx: any) => {
  try {
    const newValue = transformJSX(data.value);
    const fnInfo = parseFunctionString(newValue);
    if (!fnInfo) throw Error('函数解析失败，请检查格式。示例：function fnName() { }');
    return parseExpression(
      {
        type: JS_EXPRESSION,
        value: `(${data.value}).bind(this)`,
      },
      scope,
      ctx,
      true,
    );
  } catch (error) {
    Notify(
      {
        type: 'warning',
        title: '函数声明解析报错',
        message: (error as Error)?.message || '函数声明解析报错，请检查语法',
      },
      ctx,
    );

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
    if (typeof scope === 'object' && Object.keys(scope).length > 0) {
      return generateFn(
        parseExpression(
          {
            type: JS_EXPRESSION,
            value: `(${data.value}).bind(this)`,
          },
          scope,
          ctx,
        ),
        ctx,
      );
    }
    const innerFn = newFn(`return ${data.value}`).bind(ctx)();
    return generateFn(innerFn, ctx);
  } catch (error) {
    return parseJSXFunction(data, scope, ctx);
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
const parseObjectData = (data: any, scope: any, ctx: any) => {
  if (!data) {
    return data;
  }

  // 如果是状态访问器,则直接解析默认值
  if (isStateAccessor(data)) {
    return parseData(data.defaultValue, scope, ctx);
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

  const refValue = propsEntries.find(
    ([key, value]: [string, any]) => key === 'ref' && value?.type === JS_EXPRESSION,
  );
  if (refValue) {
    res['ref'] = parseData(
      {
        type: JS_FUNCTION,
        value: `(instance) => ${(refValue[1] as any).value}=instance`,
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
