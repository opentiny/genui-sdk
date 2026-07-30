type SchemaFunction = { type: 'JSFunction'; value: string };
type SchemaExpression = { type: 'JSExpression'; value: string; params?: string[] };

type SchemaContext = Record<string, unknown> & {
  state?: Record<string, unknown>;
  refs?: Record<string, unknown>;
};

function parseExpression(data: SchemaExpression, scope: Record<string, unknown>, ctx: SchemaContext) {
  const mergeScope = { ...ctx, ...scope, slotScope: scope };
  let expression = data.value;
  const params: Record<string, unknown> = {};
  if (data.params?.length) {
    data.params.forEach((paramName) => {
      params[paramName] = mergeScope[paramName];
    });
    expression = `(e) => {(${expression}).call(this, e, ${data.params.join(',')})}`;
  }
  return new Function('$scope', `with($scope || {}) { return ${expression} }`).call(ctx, {
    ...mergeScope,
    ...params,
  });
}

function parseJSFunction(data: SchemaFunction, scope: Record<string, unknown>, ctx: SchemaContext) {
  if (typeof scope === 'object' && Object.keys(scope).length > 0) {
    const fn = parseExpression({ type: 'JSExpression', value: data.value }, scope, ctx);
    return fn.bind(ctx);
  }
  const innerFn = new Function(`return ${data.value}`).bind(ctx)();
  return innerFn.bind(ctx);
}

export function parseSchemaValue(
  data: SchemaFunction | SchemaExpression,
  scope: Record<string, unknown>,
  ctx: SchemaContext,
) {
  if (data.type === 'JSExpression') {
    return parseExpression(data, scope, ctx);
  }
  return parseJSFunction(data, scope, ctx);
}

export function createContext(schema: Record<string, unknown>) {
  const context: SchemaContext = {
    state: structuredClone((schema.state as Record<string, unknown>) ?? {}),
    refs: structuredClone((schema.refs as Record<string, unknown>) ?? {}),
  };

  const methods = (schema.methods as Record<string, SchemaFunction>) ?? {};
  Object.keys(methods).forEach((key) => {
    context[key] = parseSchemaValue(methods[key], {}, context);
  });

  const lifeCycles = (schema.lifeCycles as Record<string, SchemaFunction>) ?? {};
  Object.keys(lifeCycles).forEach((key) => {
    context[key] = parseSchemaValue(lifeCycles[key], {}, context);
  });

  return context;
}

export function runLifeCycle(context: SchemaContext, name: string) {
  const fn = context[name];
  if (typeof fn === 'function') {
    fn.call(context);
  }
}
