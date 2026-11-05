import type { ILoopScope } from './types';

export const UNWRAP_QUOTES = {
  start: '#QUOTES_START#',
  end: '#QUOTES_END#',
};

export const [JS_EXPRESSION, JS_FUNCTION, JS_SLOT] = [
  'JSExpression',
  'JSFunction',
  'JSSlot'
]

export const NG_TEMPLATE_SCHEMA_NAME = 'NgTemplate';

/**
 * state 字面量里 get 访问器的占位串:JSON.stringify 生成不出 `get x()` 这种键形态,
 * 先拿它占住值的位置,拼 state 字面量时再整项换成 getter(见 AngularClassBodyBuilder.buildStateFields)。
 */
export const stateGetterToken = (index: number): string => `#STATE_GETTER_${index}#`;

export const EMPTY_LOOP_SCOPE: ILoopScope = { depth: 0, indexVars: [], templateVars: [], conditionalInsideLoop: false };
