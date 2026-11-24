/**
 * 产物文本层：把整份源码交给 prettier —— 先格式化 inline template，再格式化外层 TS；
 * 另提供一次 TS 语法校验。与 JSFunction 的解析/改写无关（见 AngularFunctionParser）。
 */
export interface IPrettierFailure {
  /** 失败发生在模板段还是外层 TS 段 */
  stage: 'template' | 'typescript';
  message: string;
}

export interface IPrettierResult {
  code: string;
  failure?: IPrettierFailure;
}

export class AngularSourceFormatter {
  /** 格式化产物；失败时返回原文与失败阶段,由调用方落到 errors 通道 */
  async format(source: string, prettierOpts: Record<string, unknown>): Promise<IPrettierResult> {
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
