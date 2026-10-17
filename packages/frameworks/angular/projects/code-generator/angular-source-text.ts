/**
 * 出码文本层：解析 JSFunction 的源码串、把 `function () {…}.bind(this)` 改写成箭头函数，最后把整份源码交给 prettier。
 * 只借基类那两个纯函数（见 IBaseHelpers），自身不持有出码状态。
 */
import type { IBaseHelpers } from './base-helpers';

export interface IPrettierFailure {
  /** 失败发生在模板段还是外层 TS 段 */
  stage: 'template' | 'typescript';
  message: string;
}

export interface IPrettierResult {
  code: string;
  failure?: IPrettierFailure;
}

export class AngularSourceText {
  constructor(private readonly base: IBaseHelpers) {}
  parseFunctionOrThrow(fnStr: string): { type: string; params: string[]; body: string } {
    const info = this.base.getFunctionInfo(fnStr);
    const parsed = info ?? this.parseArrowFunction(fnStr);
    if (parsed) {
      return { ...parsed, body: this.rewriteBindThis(parsed.body) };
    }
    throw new Error(
      `[AngularCodeGenerator] 无法解析函数，仅支持 \`function 名字(...) { ... }\` 与箭头函数 \`(a) => ...\`：${fnStr}`,
    );
  }

  private rewriteBindThis(body: string): string {
    let result = '';
    let index = 0;
    while (index < body.length) {
      // 当前位置是不是字符串 或 注释的开头， 是就返回这一整段结束后的下标，改写器不处理 [index, literalEnd]范围内的东西。
      const literalEnd = this.skipLiteral(body, index);
      if (literalEnd > index) {
        result += body.slice(index, literalEnd);
        index = literalEnd;
        continue;
      }
      // 只有命中 function(…) {…}.bind(this) 形式的才改
      const rewritten = this.rewriteBoundFunction(body, index);
      if (rewritten) {
        result += rewritten.text;
        index = rewritten.end;
        continue;
      }
      // 不改写时逐字符前进：嵌套在里层的那些仍在后续轮次里被处理
      result += body[index];
      index++;
    }
    return result;
  }

  // "methods": {
  //   "handleSave": {
  //     "type": "JSFunction",
  //     "value": "function() { var updatedList = this.state.userList.map(function(item, index) { var inputRef = this.refs.inputs[index]; if (inputRef) { item.name = inputRef.value; } return item; }.bind(this)); this.state.userList = updatedList; this.callAction('saveState'); this.callAction('continueChat', { message: '批量编辑已保存' }); }"
  //   }
  // }
  // function () { … this.x … }.bind(this) 会报错	TS2683
  // 改成 () => { … this.x … }
  private rewriteBoundFunction(source: string, from: number): { text: string; end: number } | null {
    if (!source.startsWith('function', from) || /[\w$.]/.test(source[from - 1] ?? '')) {
      return null;
    }
    const afterKeyword = source[from + 'function'.length];
    if (afterKeyword && /[\w$]/.test(afterKeyword)) {
      return null; // `functionXxx`
    }
    const paramsStart = this.skipSpace(source, from + 'function'.length);
    if (source[paramsStart] !== '(') {
      return null;
    }
    const paramsEnd = this.matchBracket(source, paramsStart, '(', ')');
    if (paramsEnd < 0) {
      return null;
    }
    const bodyStart = this.skipSpace(source, paramsEnd + 1);
    if (source[bodyStart] !== '{') {
      return null;
    }
    const bodyEnd = this.matchBracket(source, bodyStart, '{', '}');
    if (bodyEnd < 0) {
      return null;
    }
    const bindStart = this.skipSpace(source, bodyEnd + 1);
    const bound = /^\.bind\s*\(\s*this\s*\)/.exec(source.slice(bindStart));
    if (!bound) {
      return null;
    }
    const inner = source.slice(bodyStart + 1, bodyEnd);
    if (/\barguments\b/.test(this.base.stripLiterals(inner))) {
      return null; // 箭头没有自己的 arguments
    }
    const params = source.slice(paramsStart + 1, paramsEnd);
    return {
      text: `(${params}) => {${this.rewriteBindThis(inner)}}`,
      end: bindStart + bound[0].length,
    };
  }

  /** index 处是字符串 / 模板串 / 注释时返回它之后的下标，否则 -1（stripLiterals 会改变长度，没法据此按原位切） */
  private skipLiteral(source: string, index: number): number {
    const quote = source[index];
    if (quote === "'" || quote === '"' || quote === '`') {
      for (let cursor = index + 1; cursor < source.length; cursor++) {
        if (source[cursor] === '\\') {
          cursor++;
        } else if (source[cursor] === quote) {
          return cursor + 1;
        }
      }
      return source.length;
    }
    if (quote !== '/') {
      return -1;
    }
    if (source[index + 1] === '/') {
      const lineEnd = source.indexOf('\n', index);
      return lineEnd < 0 ? source.length : lineEnd;
    }
    if (source[index + 1] === '*') {
      const commentEnd = source.indexOf('*/', index + 2);
      return commentEnd < 0 ? source.length : commentEnd + 2;
    }
    return -1;
  }

  /** 配平括号：返回与 from 处 open 配对的 close 下标；扫到结尾仍未配平返回 -1 */
  private matchBracket(source: string, from: number, open: string, close: string): number {
    let depth = 0;
    for (let index = from; index < source.length; index++) {
      const literalEnd = this.skipLiteral(source, index);
      if (literalEnd > index) {
        index = literalEnd - 1; // 字面量里的括号不参与配平
        continue;
      }
      if (source[index] === open) {
        depth++;
      } else if (source[index] === close && --depth === 0) {
        return index;
      }
    }
    return -1;
  }

  private skipSpace(source: string, from: number): number {
    let index = from;
    while (index < source.length && /\s/.test(source[index])) {
      index++;
    }
    return index;
  }

  parseArrowFunction(fnStr: string): { type: string; params: string[]; body: string } | null {
    const source = fnStr.trim().replace(/;+\s*$/, '').trim();
    const matched = /^(async\s+)?(?:\(([^()]*)\)|([A-Za-z_$][\w$]*))\s*=>\s*([\s\S]+)$/.exec(source);
    if (!matched) {
      return null;
    }

    const [, asyncKeyword, parenParams, bareParam, rawBody] = matched;
    const params = (parenParams ?? bareParam ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (!params.every((param) => /^[A-Za-z_$][\w$]*$/.test(param))) {
      return null;
    }

    const body = rawBody.trim();
    const type = asyncKeyword ? 'async' : '';
    if (!body.startsWith('{')) {
      // 表达式体：`(a) => a + 1` 与 `(a) => { return a + 1; }` 等价，补出 return
      return { type, params, body: `return ${body};` };
    }
    if (!body.endsWith('}')) {
      return null;
    }
    // 只剥最外层花括号，内层原样保留
    return { type, params, body: body.slice(1, -1) };
  }

  /** 格式化产物；失败时返回原文与失败阶段,由调用方落到 errors 通道 */
  async formatWithPrettier(source: string, prettierOpts: Record<string, unknown>): Promise<IPrettierResult> {
    let stage: IPrettierFailure['stage'] = 'template';
    try {
      const [
        { format },
        { default: htmlPlugin },
        { default: typescriptPlugin },
        { default: estreePlugin },
      ] = await Promise.all([
        import('prettier/standalone'),
        import('prettier/plugins/html'),
        import('prettier/plugins/typescript'),
        import('prettier/plugins/estree'),
      ]);

      // 1) 抽出并格式化 inline template
      let formatted = source;
      const templateMatch = source.match(/template: `([\s\S]*?)`,/);
      if (templateMatch) {
        const formattedTemplate = await format(templateMatch[1], {
          ...prettierOpts,
          parser: 'angular',
          plugins: [htmlPlugin],
        });
        const indentedTemplate = formattedTemplate
          .trimEnd()
          .split('\n')
          .map((line: string) => `      ${line}`)
          .join('\n');
        formatted = source.replace(
          /template: `([\s\S]*?)`,/,
          () => `template: \`\n${indentedTemplate}\n  \`,`,
        );
      }

      // 2) 整体格式化外层 TS 结构
      stage = 'typescript';
      return {
        code: await format(formatted, {
          ...prettierOpts,
          parser: 'typescript',
          plugins: [typescriptPlugin, estreePlugin],
        }),
      };
    } catch (error) {
      return { code: source, failure: { stage, message: error instanceof Error ? error.message : String(error) } };
    }
  }

  /** TS 语法校验(借 prettier 的 TS parser 完整解析一遍)，通过返回 null */
  async checkTypeScript(source: string, prettierOpts: Record<string, unknown>): Promise<string | null> {
    try {
      const [{ format }, { default: typescriptPlugin }, { default: estreePlugin }] = await Promise.all([
        import('prettier/standalone'),
        import('prettier/plugins/typescript'),
        import('prettier/plugins/estree'),
      ]);
      await format(source, {
        ...prettierOpts,
        parser: 'typescript',
        plugins: [typescriptPlugin, estreePlugin],
      });
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  }
}
