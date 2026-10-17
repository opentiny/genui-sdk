import type { CardSchema } from '@opentiny/genui-sdk-core';
import { JS_EXPRESSION, JS_FUNCTION, JS_SLOT } from './constants';
import type {
  ICodeGeneratorParams,
  ICodegenDescription,
  IFrameworkCodeGenerator,
  ICodeGeneratorResult,
} from './types';
export abstract class CodeGeneratorBase implements IFrameworkCodeGenerator<ICodeGeneratorParams, ICodeGeneratorResult> {

  protected replaceThis(value: string): string {
    return value.replace(/this\./g, '');
  }

  protected toCamelCase(str: string): string {
    return str.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
  }

  protected avoidDuplicateString(existings: string[], baseName: string): string {
    let result = baseName;
    let suffix = 1;
    while (existings.includes(result)) {
      result = `${baseName}${suffix}`;
      suffix++;
    }
    return result;
  }

  protected isOnEventKey(key: string): boolean {
    return /^on([A-Z]\w*)/.test(key);
  }

  protected resolvePropValueType(value: unknown): string {
    const builtInTypes = [JS_EXPRESSION, JS_FUNCTION, JS_SLOT];
    if (value && typeof value === 'object' && 'type' in value) {
      const protocolType = (value as { type?: string }).type;
      if (typeof protocolType === 'string' && builtInTypes.includes(protocolType)) {
        return protocolType;
      }
    }
    return 'literal';
  }

  protected getFunctionInfo(fnStr: string): { type: string; params: string[]; body: string } | null {
    const fnRegexp = /(async)?.*?(\w+) *\(([\s\S]*?)\) *\{([\s\S]*)\}/;
    const result = fnRegexp.exec(fnStr);
    if (!result) {
      return null;
    }
    return {
      type: result[1] || '',
      params: result[3]
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      body: result[4],
    };
  }

  /** 去掉字符串与注释：其中的关键字、箭头、花括号都不是代码 */
  protected stripLiterals(source: string): string {
    return source
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")
      .replace(/"(?:[^"\\]|\\.)*"/g, '""')
      .replace(/`(?:[^`\\]|\\.)*`/g, '``')
      .replace(/\/\/[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
  }

  protected createCodegenMeta(): ICodegenDescription { // 
    return {
      componentSet: new Set(),
      templateLocals: new Set(),
      iconComponents: { componentNames: [], exportNames: [] }, // 纯预留
      stateAccessors: [],
      viewChildRefs: [],
      templateGeneratedMethods: [],
      hoistedMethodNames: new Set(),
      methodArityFloor: {},
      templateExpressions: [],
      templateExprCounter: 0,
      templateMethodCounter: 0,
    };
  }

  protected normalizeIncomingSchema(origin: CardSchema | string | null | undefined): CardSchema {
    if (origin == null) {
      return { componentName: 'Page', children: [] } as CardSchema;
    }
    if (typeof origin === 'string') {
      const trimmed = origin.trim();
      if (!trimmed) {
        return { componentName: 'Page', children: [] } as CardSchema;
      }
      try {
        return JSON.parse(trimmed) as CardSchema;
      } catch {
        return { componentName: 'Page', children: [] } as CardSchema;
      }
    }
    return origin as CardSchema;
  }

  abstract generate(params: ICodeGeneratorParams): Promise<ICodeGeneratorResult>;
}
