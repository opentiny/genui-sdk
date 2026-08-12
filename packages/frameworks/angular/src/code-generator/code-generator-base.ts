import type { CardSchema } from '@opentiny/genui-sdk-core';
import { JS_EXPRESSION, JS_FUNCTION, JS_I18N, JS_RESOURCE, JS_SLOT } from './constants';
import type {
  ICodeGeneratorParams,
  ICodegenDescription,
  IFrameworkCodeGenerator,
  ICodeGeneratorResult,
} from './types';
/**
 * 框架无关的代码生成基类。
 * 负责 schema 解析、协议类型判断、函数分析、状态遍历等通用逻辑。
 * 子类（如 AngularCodeGeneratorBase）负责具体框架的模板语法和组件源码生成。
 */
export abstract class CodeGeneratorBase
  implements IFrameworkCodeGenerator<ICodeGeneratorParams, ICodeGeneratorResult> {

  // ===================================================================
  // 字符串工具
  // ===================================================================

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

  // ===================================================================
  // 协议类型判断
  // ===================================================================

  protected resolvePropValueType(value: unknown): string {
    const builtInTypes = [JS_EXPRESSION, JS_FUNCTION, JS_I18N, JS_RESOURCE, JS_SLOT];
    if (value && typeof value === 'object' && 'type' in value) {
      const protocolType = (value as { type?: string }).type;
      if (typeof protocolType === 'string' && builtInTypes.includes(protocolType)) {
        return protocolType;
      }
    }
    return 'literal';
  }

  // ===================================================================
  // 函数分析
  // ===================================================================

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

  /**
   * 从函数体中提取引用模板变量的自由变量名（如 *ngFor / v-for 中的循环变量）。
   * 通过排除关键字、内置对象、字符串和属性访问路径来识别。
   */
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

  // ===================================================================
  // 代码转换
  // ===================================================================

  protected buildJSFunctionExpression(value: string, actionNames?: Set<string>): string {
    const info = this.getFunctionInfo(value);
    if (!info) {
      let result = this.replaceThis(value);
      if (actionNames) {
        result = this.transformCallActionCalls(result, actionNames);
      }
      return result;
    }
    const asyncPrefix = info.type ? `${info.type} ` : '';
    let body = info.body;
    if (actionNames) {
      body = this.transformCallActionCalls(body, actionNames);
    }
    body = body.replace(/this\.props\./g, 'this.');
    return `${asyncPrefix}(${info.params.join(',')}) => { ${body} }`;
  }

  /**
   * 将 this.callAction('name', payload) 替换为 this.name.emit(payload)，
   * 同时收集 action 名称到 actionNames 集合中。
   */
  protected transformCallActionCalls(code: string, actionNames: Set<string>): string {
    return code.replace(
      /this\.callAction\s*\(\s*['"]([^'"]+)['"]\s*(,\s*([^)]*))?\)/g,
      (_, name: string, _commaAndArgs: string, args: string) => {
        actionNames.add(name);
        const prop = this.toCamelCase(name);
        return args ? `this.${prop}.emit(${args.trim()})` : `this.${prop}.emit()`;
      },
    );
  }

  // ===================================================================
  // 状态管理
  // ===================================================================

  protected createCodegenMeta(): ICodegenDescription {
    return {
      componentSet: new Set(),
      iconComponents: { componentNames: [], exportNames: [] },
      internalTypes: new Set(),
      stateAccessors: [],
    };
  }

  protected hoistPropToState(key: string, item: unknown, attrsArr: string[], state: Record<string, unknown>): void {
    const valueKey = this.avoidDuplicateString(Object.keys(state), key);
    state[valueKey] = item;
    attrsArr.push(`[${key}]="state.${valueKey}"`);
  }

  // ===================================================================
  // Schema 处理
  // ===================================================================

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

  // ===================================================================
  // 格式化
  // ===================================================================

  protected async formatWithPrettier(source: string, prettierOpts: Record<string, unknown>): Promise<string> {
    try {
      const [{ format }, { default: htmlPlugin }, { default: babelPlugin }, { default: estreePlugin }] =
        await Promise.all([
          import('prettier/standalone'),
          import('prettier/plugins/html'),
          import('prettier/plugins/babel'),
          import('prettier/plugins/estree'),
        ]);

      return await format(source, {
        ...prettierOpts,
        plugins: [htmlPlugin, babelPlugin, estreePlugin],
      });
    } catch {
      return source;
    }
  }

  // ===================================================================
  // 公共入口（由子类实现）
  // ===================================================================

  abstract generate(params: ICodeGeneratorParams): Promise<ICodeGeneratorResult>;
}
