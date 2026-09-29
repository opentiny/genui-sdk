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

  // 把函数里的嵌套函数的 形参、函数体替换成空格。 避免干扰最外层函数的自由变量提取，自由变量即函数内模板作用域下的变量
  protected maskNestedFunctions(code: string): string {
    const chars = code.split('');
    const blank = (from: number, to: number) => {
      for (let i = Math.max(0, from); i < to && i < chars.length; i++) {
        chars[i] = ' ';
      }
    };
    // 从 `{` 开始配平，返回配对 `}` 之后的下标
    const afterBlock = (braceIndex: number): number => {
      let depth = 0;
      for (let i = braceIndex; i < chars.length; i++) {
        if (chars[i] === '{') {
          depth++;
        } else if (chars[i] === '}' && --depth === 0) {
          return i + 1;
        }
      }
      return chars.length;
    };
    // 表达式体：挖到同层的 `,` `;` 或收尾括号为止
    const afterExpression = (startIndex: number): number => {
      let depth = 0;
      for (let i = startIndex; i < chars.length; i++) {
        if ('([{'.includes(chars[i])) {
          depth++;
        } else if (')]}'.includes(chars[i])) {
          if (depth === 0) {
            return i;
          }
          depth--;
        } else if (depth === 0 && (chars[i] === ',' || chars[i] === ';')) {
          return i;
        }
      }
      return chars.length;
    };
    // 挖掉 from（跳过空白）之后紧跟的函数体，返回函数体之后的下标
    const maskBody = (from: number): number => {
      let start = from;
      while (start < chars.length && chars[start] === ' ') {
        start++;
      }
      const end = chars[start] === '{' ? afterBlock(start) : afterExpression(start);
      blank(start, end);
      return end;
    };

    let index = 0;
    while (index < chars.length) {
      if (chars[index] === '=' && chars[index + 1] === '>') {
        // 向左回收形参：`a =>` 或 `(a, b) =>`
        let cursor = index - 1;
        while (cursor >= 0 && chars[cursor] === ' ') {
          cursor--;
        }
        if (chars[cursor] === ')') {
          let depth = 0;
          for (let i = cursor; i >= 0; i--) {
            if (chars[i] === ')') {
              depth++;
            } else if (chars[i] === '(' && --depth === 0) {
              blank(i + 1, cursor);
              break;
            }
          }
        } else {
          while (cursor >= 0 && /[\w$]/.test(chars[cursor])) {
            cursor--;
          }
          blank(cursor + 1, index);
        }
        index = maskBody(index + 2);
        continue;
      }
      if (code.startsWith('function', index) && !/[\w$.]/.test(code[index - 1] ?? '')) {
        const parenStart = code.indexOf('(', index);
        let end = -1;
        if (parenStart !== -1) {
          let depth = 0;
          for (let i = parenStart; i < chars.length; i++) {
            if (chars[i] === '(') {
              depth++;
            } else if (chars[i] === ')' && --depth === 0) {
              end = maskBody(i + 1);
              break;
            }
          }
        }
        if (end === -1) {
          index++;
          continue;
        }
        // 保留函数名（顶层具名函数是一处声明），只挖形参列表与函数体
        blank(parenStart, end);
        index = end;
        continue;
      }
      index++;
    }

    return chars.join('');
  }

  // 收集当前层自己绑定的名字：局部声明、具名类、catch 形参（嵌套函数的形参已被挖空）
  protected collectBoundNames(code: string): Set<string> {
    const bound = new Set<string>();

    // 按顶层逗号切分，跳过 {} [] () 内部的逗号
    const splitTopLevel = (text: string): string[] => {
      const parts: string[] = [];
      let depth = 0;
      let current = '';
      for (const char of text) {
        if ('{[('.includes(char)) {
          depth++;
        } else if ('}])'.includes(char)) {
          depth--;
        }
        if (char === ',' && depth === 0) {
          parts.push(current);
          current = '';
          continue;
        }
        current += char;
      }
      parts.push(current);
      return parts;
    };

    // 从声明模式里取绑定名：`=` 右侧是初值/默认值，`{ key: alias }` 里带冒号的是属性名 key
    const addPattern = (pattern: string) => {
      const withoutInitializers = pattern.replace(/=[^,;}]*/g, '');
      for (const match of withoutInitializers.matchAll(/([A-Za-z_$][\w$]*)\s*(:?)/g)) {
        if (!match[2]) {
          bound.add(match[1]);
        }
      }
    };

    // const / let / var，含 for...of / for...in 头部与解构
    for (const match of code.matchAll(/\b(?:const|let|var)\s+/g)) {
      const rest = code.slice((match.index ?? 0) + match[0].length);
      // 截到语句结束；for 头部再截到 of / in
      const statement = rest.split(/[;\n]/)[0].split(/\bof\b|\bin\b/)[0];
      for (const declarator of splitTopLevel(statement)) {
        addPattern(declarator.split('=')[0]);
      }
    }
    // 具名函数/类声明（函数名留在原位，形参与函数体已被挖空）
    for (const match of code.matchAll(/\b(?:function|class)\s+([A-Za-z_$][\w$]*)/g)) {
      bound.add(match[1]);
    }
    // catch 形参
    for (const match of code.matchAll(/\bcatch\s*\(([^)]*)\)/g)) {
      addPattern(match[1]);
    }

    return bound;
  }

  // 从一个函数体里挑出“函数自己没声明、却引用到的变量”， 即由模板作用域引入的变量。
  protected extractFreeVariables(body: string): string[] {
    const scoped = this.maskNestedFunctions(this.stripLiterals(body));
    let cleaned = scoped
      .replace(/this\.\w+/g, '')
      .replace(/'[^']*'/g, '')
      .replace(/"[^"]*"/g, '')
      .replace(/`[^`]*`/g, '')
      .replace(/\w+\s*:/g, '')
      .replace(/\.\w+/g, '')
      .replace(/\b\d+(\.\d+)?\b/g, '');
    const identifiers = cleaned.match(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g) || [];
    const boundNames = this.collectBoundNames(scoped);
    const keywords = new Set([
      'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
      'return', 'var', 'let', 'const', 'function', 'typeof', 'instanceof',
      'new', 'delete', 'void', 'yield', 'async', 'await', 'of', 'in',
      'try', 'catch', 'finally', 'throw', 'debugger', 'with',
      'this', 'super', 'import', 'export', 'enum',
      'true', 'false', 'null', 'undefined', 'NaN', 'Infinity',
      'console', 'Math', 'Date', 'JSON', 'Object', 'String', 'Number', 'Array',
      'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'Error', 'Map', 'Set', 'Promise',
      'emit', 'push', 'pop', 'filter', 'map', 'find', 'forEach', 'reduce', 'sort',
      'slice', 'splice', 'join', 'includes', 'indexOf', 'length', 'keys', 'values',
      'alert', 'fetch', 'setTimeout', 'setInterval', 'parse', 'stringify',
      'state', 'props', 'event', 'callback',
    ]);
    return [...new Set(identifiers.filter((id) => !keywords.has(id) && !boundNames.has(id)))];
  }

  protected createCodegenMeta(): ICodegenDescription { // 
    return {
      componentSet: new Set(),
      iconComponents: { componentNames: [], exportNames: [] }, // 纯预留
      stateAccessors: [],
      viewChildRefs: [],
      templateGeneratedMethods: [],
      hoistedMethodNames: new Set(),
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
