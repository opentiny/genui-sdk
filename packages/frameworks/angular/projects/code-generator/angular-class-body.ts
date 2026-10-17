/**
 * 类体层：把 schema（state / methods / lifeCycles）+ 出码元数据拼成组件类里的成员。
 * 只借三层里的取文本、值遍历与 ref 赋值，不反向调用模板层。
 */
import type { CardSchema } from '@opentiny/genui-sdk-core';
import type { IAngularClassSectionDefinition, ICodegenDescription, IStateAccessorDefinition } from './types';
import { stateGetterToken } from './constants';
import { MEMBER_NAME_RE, unwrapExpression } from './utils';
import { AngularBindingRenderer } from './angular-binding-renderer';
import { AngularRefResolver } from './angular-ref-resolver';
import { AngularSourceText } from './angular-source-text';

export class AngularClassBodyBuilder {
  constructor(
    private readonly sourceText: AngularSourceText,
    private readonly bindings: AngularBindingRenderer,
    private readonly refs: AngularRefResolver,
  ) {}
  buildStateFields(schema: CardSchema, description: ICodegenDescription): string {
    const { state = {} } = schema;
    // 第三参 0 = 这一趟是 state 顶层:标了 computed / 引用 this.state 自身的值会被登记成 state 字面量里的 getter
    this.bindings.traverseValue(state as Record<string, any>, description, undefined, 0);
    const stateStr = unwrapExpression(JSON.stringify(state, null, 2));
    if (!stateStr || stateStr === '{}') {
      return '';
    }
    return `state = ${this.attachStateGetters(stateStr, description.stateAccessors)};`;
  }

  private attachStateGetters(stateJson: string, accessors: IStateAccessorDefinition[]): string {
    return accessors.reduce((text, { name, getterBody }, index) => {
      return text.replace(`"${name}": "${stateGetterToken(index)}"`, () => `get ${name}() {\n    ${getterBody}\n  }`);
    }, stateJson);
  }

  buildMethods(schema: CardSchema, description: ICodegenDescription): string {
    const { methods = {} } = schema;
    const methodLines = Object.entries(methods).map(([key, item]) => {
      // 由 prop 提升来的函数:当值交给子组件,须箭头化以绑定 this
      if (description.hoistedMethodNames.has(key)) {
        return MEMBER_NAME_RE.test(key) ? `${key} = ${this.buildJSFunctionExpression(item.value)};` : '';
      }

      const info = this.sourceText.parseFunctionOrThrow(item.value);
      const asyncPrefix = info.type ? `${info.type} ` : '';
      const methodName = asyncPrefix && key.startsWith(asyncPrefix.trim())
        ? key.slice(asyncPrefix.length)
        : key;
      const body = info.body;
      // 模板里的调用实参可能比声明多(见 methodArityFloor),补上不引用的可选形参,否则模板调用报 TS2554
      const params = [...info.params];
      while (params.length < (description.methodArityFloor[key] ?? 0)) {
        params.push(`__arg${params.length}`);
      }
      const paramsWithTypes = params.map((p) => `${p}?: any`).join(', ');

      // 成员名直接进类体:非法名字丢弃,避免改坏类结构
      return MEMBER_NAME_RE.test(methodName)
        ? `${asyncPrefix}${methodName}(${paramsWithTypes}) { ${body} }`
        : '';
    });
    return methodLines.filter(Boolean).join('\n\n  ');
  }

  /** 事件绑定自动生成的类方法(__handleN),来自 handleEventBinding 收集到元数据的方法串 */
  buildTemplateEventMethods(codegenMeta: ICodegenDescription): string {
    return codegenMeta.templateGeneratedMethods.join('\n');
  }

  /** 模板语法表达不了的表达式提升成的方法(__exprN) */
  buildTemplateExpressions(codegenMeta: ICodegenDescription): string {
    return codegenMeta.templateExpressions
      .map(({ name, body, vars }) => {
        const params = vars.map((v) => `${v}?: any`).join(', ');
        return `${name}(${params}) {\n    return ${body};\n  }`;
      })
      .join('\n\n  ');
  }

  /** 生命周期函数体:取 lifeCycles[hook] 的函数体。落在类主体内,this 原样保留 */
  buildLifecycleBody(
    schema: CardSchema,
    hook: 'onMounted' | 'onUnmounted',
  ): { body: string; isAsync: boolean } {
    const hookFn = schema.lifeCycles?.[hook];
    if (!hookFn) {
      return { body: '', isAsync: false };
    }
    const info = this.sourceText.parseFunctionOrThrow(hookFn.value ?? '');
    return { body: info.body, isAsync: info.type === 'async' };
  }

  buildLifecycleMethods(
    codegenMeta: ICodegenDescription,
    schema: CardSchema,
  ): { init: string; destroy: string; afterViewInit: string } {
    const mount = this.buildLifecycleBody(schema, 'onMounted');
    const destroy = this.buildLifecycleBody(schema, 'onUnmounted');
    const refAssignments = codegenMeta.viewChildRefs
      .map((item) => this.refs.buildRefAssignment(item))
      .join('\n    ');

    // refs 由 @ViewChild 在 ngAfterViewInit 才赋值,onMounted 用到 refs 必须排在其后;
    // 再放进微任务,避免在 ngAfterViewInit 里改 state 触发 ExpressionChangedAfterItHasBeenCheckedError
    const mountAfterView = !!mount.body && codegenMeta.viewChildRefs.length > 0;
    const afterViewInitBody = [
      refAssignments,
      mountAfterView ? `Promise.resolve().then(async () => {\n      ${mount.body}\n    });` : '',
    ].filter(Boolean).join('\n    ');

    return {
      init: mount.body && !mountAfterView
        ? `${mount.isAsync ? 'async ' : ''}ngOnInit(): ${mount.isAsync ? 'Promise<void>' : 'void'} {\n    ${mount.body}\n  }`
        : '',
      destroy: destroy.body
        ? `${destroy.isAsync ? 'async ' : ''}ngOnDestroy(): ${destroy.isAsync ? 'Promise<void>' : 'void'} {\n    ${destroy.body}\n  }`
        : '',
      afterViewInit: afterViewInitBody ? `ngAfterViewInit(): void {\n    ${afterViewInitBody}\n  }` : '',
    };
  }

  buildCallActionMethod(needsCallAction: boolean): string {
    return needsCallAction
      ? 'callAction(name: string, params?: unknown): void {\n' +
        '    console.warn(`[GenUI] callAction("${name}") is available at runtime via customActions; implement it for exported code.`, params);\n' +
        '  }'
      : '';
  }

  /** 按段落定义顺序拼接非空类体成员,段间留空行 */
  assembleSections(sections: IAngularClassSectionDefinition[]): string {
    return sections
      .map((section) => section.build())
      .filter(Boolean)
      .join('\n\n');
  }

  // 只有箭头才能把函数体里的 this 锁在组件实例上。
  buildJSFunctionExpression(value: string): string {
    const info = this.sourceText.parseFunctionOrThrow(value);
    const asyncPrefix = info.type ? `${info.type} ` : '';
    const body = info.body;
    // 形参显式标 any
    const paramsWithTypes = info.params.map((p) => `${p}?: any`).join(', ');
    return `${asyncPrefix}(${paramsWithTypes}) => { ${body} }`;
  }
}
