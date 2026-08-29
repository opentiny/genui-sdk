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

  protected extractFreeVariables(body: string): string[] {
    let cleaned = body
      .replace(/this\.\w+/g, '')
      .replace(/'[^']*'/g, '')
      .replace(/"[^"]*"/g, '')
      .replace(/`[^`]*`/g, '')
      .replace(/\w+\s*:/g, '')
      .replace(/\.\w+/g, '')
      .replace(/\b\d+(\.\d+)?\b/g, '');
    const identifiers = cleaned.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g) || [];
    const keywords = new Set([
      'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
      'return', 'var', 'let', 'const', 'function', 'typeof', 'instanceof',
      'new', 'delete', 'void', 'yield', 'async', 'await', 'of', 'in',
      'true', 'false', 'null', 'undefined', 'NaN', 'Infinity',
      'console', 'Math', 'Date', 'JSON', 'Object', 'String', 'Number', 'Array',
      'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'Error', 'Map', 'Set', 'Promise',
      'emit', 'push', 'pop', 'filter', 'map', 'find', 'forEach', 'reduce', 'sort',
      'slice', 'splice', 'join', 'includes', 'indexOf', 'length', 'keys', 'values',
      'alert', 'fetch', 'setTimeout', 'setInterval', 'parse', 'stringify',
      'state', 'props', 'event', 'callback', 'index',
    ]);
    return [...new Set(identifiers.filter((id) => !keywords.has(id)))];
  }

  protected createCodegenMeta(): ICodegenDescription {
    return {
      componentSet: new Set(),
      iconComponents: { componentNames: [], exportNames: [] }, // 纯预留
      internalTypes: new Set(), // JS_EXPRESSION / JS_FUNCTION / JS_SLOT， 决定内联还是提升
      stateAccessors: [],
      slotTemplates: [],
      slotFields: [],
      templateGeneratedMethods: [],
      templateMethodCounter: 0,
    };
  }

  protected isEmptySlotNode(componentName: string | undefined, children: unknown): boolean {
    return (
      componentName === 'template' &&
      !(children as { length?: number; type?: string })?.length &&
      !(children as { length?: number; type?: string })?.type
    );
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
