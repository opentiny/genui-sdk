import type { CardSchema } from '@opentiny/genui-sdk-core';
import type {
  ICodeGeneratorParams,
  ICodePanel,
  IAngularCodeGeneratorOptions,
  IAngularClassSectionDefinition,
  ICodeGeneratorResult,
  ICodegenDescription,
  ICodegenError,
} from './types';
import { capitalize, escapeTemplateLiteral, hyphenate } from './utils';
import { AngularBindingRenderer } from './angular-binding-renderer';
import { AngularClassBodyBuilder } from './angular-class-body';
import { AngularMaterialsRegistry } from './angular-materials-registry';
import { AngularOutputValidator } from './angular-output-validator';
import { AngularRefResolver } from './angular-ref-resolver';
import { AngularSourceText } from './angular-source-text';
import { AngularTemplateRenderer } from './angular-template-renderer';
import type { IBaseHelpers } from './base-helpers';
import { CodeGeneratorBase } from './code-generator-base';

/** Angular 出码默认 prettier 参数(parser 为 typescript;模板部分单独用 parser 'angular') */
const DEFAULT_PRETTIER_OPTS: Record<string, unknown> = {
  semi: false,
  singleQuote: true,
  printWidth: 120,
  trailingComma: 'none',
  endOfLine: 'auto',
  tabWidth: 2,
  parser: 'typescript',
  htmlWhitespaceSensitivity: 'ignore',
};

export class AngularCodeGenerator extends CodeGeneratorBase {

  private readonly registry: AngularMaterialsRegistry;
  private readonly refs: AngularRefResolver;
  private readonly bindings: AngularBindingRenderer;
  private readonly template: AngularTemplateRenderer;
  private readonly classBody: AngularClassBodyBuilder;
  private readonly prettierOpts: Record<string, unknown>;
  private readonly sourceText: AngularSourceText;
  private readonly baseHelpers: IBaseHelpers;
  private readonly validator: AngularOutputValidator;
  private readonly enableCompileValidation: boolean;

  constructor(options: IAngularCodeGeneratorOptions) {
    super();

    if (!options?.materials?.length) {
      throw new Error(
        'AngularCodeGenerator 需要至少一个物料配置:请先从对应物料包的 code-generator 子出口 import 配置,' +
          '再经 options.materials 传入,如 new AngularCodeGenerator({ materials: [TINYNG_CONFIG] })。',
      );
    }

    this.baseHelpers = {
      getFunctionInfo: (fnStr) => this.getFunctionInfo(fnStr),
      stripLiterals: (text) => this.stripLiterals(text),
      avoidDuplicateString: (existings, baseName) => this.avoidDuplicateString(existings, baseName),
      replaceThis: (value) => this.replaceThis(value),
      resolvePropValueType: (value) => this.resolvePropValueType(value),
      isOnEventKey: (key) => this.isOnEventKey(key),
    };
    this.sourceText = new AngularSourceText(this.baseHelpers);
    this.registry = new AngularMaterialsRegistry([...options.materials]);
    this.refs = new AngularRefResolver(this.registry, this.baseHelpers);
    this.bindings = new AngularBindingRenderer(this.registry, this.refs, this.sourceText, this.baseHelpers);
    this.template = new AngularTemplateRenderer(this.bindings, this.registry);
    this.classBody = new AngularClassBodyBuilder(this.sourceText, this.bindings, this.refs);
    this.validator = new AngularOutputValidator(this.registry);
    this.enableCompileValidation = options.enableCompileValidation !== false;
    this.prettierOpts = {
      ...DEFAULT_PRETTIER_OPTS,
      ...(options.prettierOpts ?? {}),
    };
  }

  protected override getFunctionInfo(fnStr: string): { type: string; params: string[]; body: string } | null {
    return this.sourceText.parseArrowFunction(fnStr) ?? super.getFunctionInfo(fnStr);
  }

  protected buildAngularComponentSource({ schema, name }: { schema: CardSchema; name?: string }): string {
    return this.buildAngularComponentParts({ schema, name }).source;
  }

  /** 出码的同时把自检需要的模板串与元数据带出来,避免再从产物文本里反解析 */
  private buildAngularComponentParts({ schema, name }: { schema: CardSchema; name?: string }): {
    source: string;
    template: string;
    description: ICodegenDescription;
  } {
    const codegenMeta = this.createCodegenMeta();
    // 模板局部变量(模板 ref / let-)先全量扫一遍，保存在codegenMeta.templateLocals里，事件处理函数提升成类方法后要靠形参接回
    this.refs.collectTemplateLocals(schema, codegenMeta.templateLocals);
    // methods 表:模板生成期会把函数型 prop 提升进来,再由 buildMethods 统一产出类方法
    schema.methods ??= {};
    const schemaMethods = schema.methods;

    schema.state ??= {};

    const needsCallAction = /\bthis\.callAction\b/.test(JSON.stringify(schema));

    // 1) 模板:整棵 schema 一次生成(ng-template 作为普通节点在 children 里处理)
    const template = this.template.generateTemplate(schema, codegenMeta, true, schemaMethods);

    // 2) 类体各段落。字段定名必须先于任何取名字的地方
    this.refs.resolveViewChildFieldNames(schema, codegenMeta);
    const viewChildDecls = this.refs.buildViewChildDecls(codegenMeta);
    const refsField = this.refs.buildRefsField(schema, codegenMeta);
    const stateFields = this.classBody.buildStateFields(schema, codegenMeta);
    const lifecycle = this.classBody.buildLifecycleMethods(codegenMeta, schema);
    const methods = this.classBody.buildMethods(schema, codegenMeta);
    const callActionMethod = this.classBody.buildCallActionMethod(needsCallAction);

    // 3) imports 依赖类体里实际出现了什么(ngOnInit/ngOnDestroy 决定 OnInit/OnDestroy)
    const hasInit = !!lifecycle.init;
    const hasDestroy = !!lifecycle.destroy;
    const hasAfterViewInit = !!lifecycle.afterViewInit;
    // 类型符号从已生成的声明串反查,避免「类型来源」与「导入清单」两处手工维护而漂移
    const declarations = `${viewChildDecls}\n${refsField}\n${stateFields}`;
    const { importStatements, moduleNames } = this.registry.buildImports(codegenMeta, {
      init: hasInit,
      destroy: hasDestroy,
      afterViewInit: hasAfterViewInit,
      viewChild: codegenMeta.viewChildRefs.some((item) => item.kind !== 'viewChildren'),
      viewChildren: codegenMeta.viewChildRefs.some((item) => item.kind === 'viewChildren'),
      elementRef: /\bElementRef\b/.test(declarations),
      templateRef: /\bTemplateRef\b/.test(declarations),
    });

    // 4) 按段落定义顺序拼装类体
    const sections: IAngularClassSectionDefinition[] = [
      { id: 'viewChildDecls', build: () => viewChildDecls },
      { id: 'refsField', build: () => refsField },
      { id: 'state', build: () => stateFields },
      { id: 'templateEventMethods', build: () => this.classBody.buildTemplateEventMethods(codegenMeta) },
      { id: 'templateExpressions', build: () => this.classBody.buildTemplateExpressions(codegenMeta) },
      { id: 'ngOnInit', build: () => lifecycle.init },
      { id: 'ngAfterViewInit', build: () => lifecycle.afterViewInit },
      { id: 'ngOnDestroy', build: () => lifecycle.destroy },
      { id: 'methods', build: () => methods },
      { id: 'callAction', build: () => callActionMethod },
    ];
    const classBody = this.classBody.assembleSections(sections);

    const selectorName = hyphenate(name || 'SchemaCard');
    const className = capitalize(name || 'SchemaCard');
    const ngImports = ['CommonModule', 'FormsModule', ...moduleNames].join(', ');
    const implementedHooks = [hasInit && 'OnInit', hasAfterViewInit && 'AfterViewInit', hasDestroy && 'OnDestroy']
      .filter(Boolean)
      .join(', ');
    const implementsClause = implementedHooks ? ` implements ${implementedHooks}` : '';

    const stylesContent = escapeTemplateLiteral(schema.css);

    return {
      source: [
        importStatements,
        '',
        '@Component({',
        `  selector: 'app-${selectorName}',`,
        '  standalone: true,',
        `  imports: [${ngImports}],`,
        `  template: \`${escapeTemplateLiteral(template)}\`,`,
        `  styles: [\`${stylesContent}\`],`,
        '})',
        `export class ${className}Component${implementsClause} {`,
        classBody ? `  ${classBody}` : '',
        '}',
      ].join('\n'),
      template,
      description: codegenMeta,
    };
  }

  override async generate({ pageInfo, formatWithPrettier = true }: ICodeGeneratorParams): Promise<ICodeGeneratorResult> {
    const { schema: originSchema, name = 'SchemaCard' } = pageInfo;

    const schema = JSON.parse(JSON.stringify(this.normalizeIncomingSchema(originSchema))) as CardSchema;
    const { source: angularCode, template, description } = this.buildAngularComponentParts({ schema, name });
    const panelName = `${hyphenate(name)}.component.ts`;

    // 产物照常返回,校验结果单独走 errors,由调用方决定是否展示/中断
    const errors: ICodegenError[] = this.enableCompileValidation
      ? [...this.validator.validateTemplate(template), ...this.validator.validateComponentSet(description.componentSet)]
      : [];

    const panel: ICodePanel = {
      panelName,
      panelValue: angularCode,
      panelType: 'angular',
      prettierOpts: { ...this.prettierOpts },
      type: 'page',
    };
    if (formatWithPrettier) {
      const formatted = await this.sourceText.formatWithPrettier(panel.panelValue, panel.prettierOpts);
      panel.panelValue = formatted.code;
      if (formatted.failure) {
        errors.push({
          code: formatted.failure.stage === 'template' ? 'PRETTIER' : 'TS_SYNTAX',
          message: `prettier 格式化失败（${formatted.failure.stage}），已返回未格式化产物：${formatted.failure.message}`,
        });
      }
    } else if (this.enableCompileValidation) {
      const syntaxError = await this.sourceText.checkTypeScript(panel.panelValue, panel.prettierOpts);
      if (syntaxError) {
        errors.push({ code: 'TS_SYNTAX', message: `TypeScript 语法错误：${syntaxError}` });
      }
    }
    return { ...panel, errors };
  }
}
