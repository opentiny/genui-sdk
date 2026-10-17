/**
 * 模板层：把 schema 树翻成模板字符串——递归子节点、文本插值、循环作用域，最后拼出整段 template。
 * 只依赖绑定层（属性/事件怎么落）与物料层（tag 怎么定），自身不产生类体内容。
 */
import type { CardSchema, JSFunction, Methods, NodeSchema } from '@opentiny/genui-sdk-core';
import { EMPTY_LOOP_SCOPE, JS_EXPRESSION, JS_FUNCTION, JS_SLOT } from './constants';
import type { IAngularTemplateAttr, ICodegenDescription, ILoopScope } from './types';
import { AngularBindingRenderer } from './angular-binding-renderer';
import { AngularMaterialsRegistry } from './angular-materials-registry';
import { MEMBER_NAME_RE, toMemberName } from './utils';

export class AngularTemplateRenderer {
  constructor(
    private readonly bindings: AngularBindingRenderer,
    private readonly registry: AngularMaterialsRegistry,
  ) {}
  recurseChildren(
    children: NodeSchema['children'],
    description: ICodegenDescription,
    result: string[],
    schemaMethods: Methods,
    loopScope: ILoopScope = EMPTY_LOOP_SCOPE,
  ): void {
    if (Array.isArray(children)) {
      result.push(
        children
          .map((child) => this.generateTemplate(child as CardSchema, description, false, schemaMethods, loopScope))
          .join(''),
      );
      return;
    }

    if (children && typeof children === 'object') {
      result.push(
        this.generateObjectChildren(children as unknown as NodeSchema, description, schemaMethods, loopScope),
      );
      return;
    }
    result.push((children as string) || '');
  }

  /**
   * 非数组 children 的兜底。协议上 children 只有数组与字符串两种,运行时还会遇到对象形态:
   * 「漏写数组括号的单节点」与「协议节点」。这两类照字面量落模板会变成 "[object Object]",
   * 所以在此按能否表达成内容分别处理,表达不出来的丢弃(不产出垃圾文本)。
   */
  generateObjectChildren(
    children: NodeSchema,
    description: ICodegenDescription,
    schemaMethods: Methods,
    loopScope: ILoopScope = EMPTY_LOOP_SCOPE,
  ): string {
    const protocolType = (children as { type?: string }).type;

    // JSExpression:还原成插值,与 Text 节点的 text 走同一套(buildTextInterpolation 的表达式分支)
    if (protocolType === JS_EXPRESSION) {
      return this.buildTextInterpolation(children, description, loopScope);
    }

    // JSFunction / JSSlot 作为内容无处安放:前者只有事件绑定一种用法,后者按 README §4 的约定全链路丢弃
    if (protocolType === JS_FUNCTION || protocolType === JS_SLOT) {
      return '';
    }

    // 漏写数组括号的单节点:当作该节点唯一的孩子重新生成
    if (typeof (children as { componentName?: unknown }).componentName === 'string') {
      return this.generateTemplate(children as CardSchema, description, false, schemaMethods, loopScope);
    }

    return '';
  }

  /** Text 文本节点生成:有 style 时包一层 <span>,无 style 时保持纯插值 */
  generateTextNode(
    props: Record<string, unknown>,
    description: ICodegenDescription,
    loopScope: ILoopScope,
  ): string {
    const interpolation = this.buildTextInterpolation(props['text'], description, loopScope);
    const style = props['style'];
    if (style === undefined || style === null || style === '') {
      return interpolation;
    }
    const styleAttr =
      typeof style === 'object' && (style as { type?: string }).type === 'JSExpression'
        ? `[style]="${this.bindings.toTemplateValue(style, description, loopScope)}"`
        : `style="${String(style).replace(/"/g, '&quot;')}"`;
    return `<span ${styleAttr}>${interpolation}</span>`;
  }

  buildTextInterpolation(text: unknown, description: ICodegenDescription, loopScope: ILoopScope): string {
    if (text && typeof text === 'object' && (text as { type?: string }).type === 'JSExpression') {
      return `{{ ${this.bindings.toTemplateValue(text, description, loopScope)} }}`;
    }
    const escaped = String(text ?? '').replace(/'/g, "\\'");
    return `{{ '${escaped}' }}`;
  }

  /**
   * 本节点向下的循环作用域。`*ngFor` 建的是模板作用域,子节点照旧看得见 `item` / `index`
   * (表达式路径一直依赖这点),所以带 loop 的节点要把自己的上下文并进祖先的继续往下传。
   * depth 记层数:嵌套循环里 `refs.x[i]` 表达不了 外层×内层 摊平后的 QueryList,得靠它挡住。
   */
  /** 循环变量名直接进 *ngFor:非法名字压成合法标识符 */
  private toLoopVar(name: unknown, fallback: string): string {
    if (typeof name !== 'string' || !name) {
      return fallback;
    }
    return MEMBER_NAME_RE.test(name) ? name : toMemberName(name);
  }

  resolveLoopScope(
    loop: NodeSchema['loop'],
    loopArgs: string[],
    conditional: boolean,
    parent: ILoopScope,
  ): ILoopScope {
    // 循环里再套条件渲染:被跳过的迭代不进 QueryList,下标就被压缩了
    const conditionalInsideLoop = parent.conditionalInsideLoop || (parent.depth > 0 && conditional);
    if (!loop) {
      return { ...parent, conditionalInsideLoop };
    }
    const itemVar = this.toLoopVar(loopArgs[0], 'item');
    const indexVar = loopArgs[1] ? this.toLoopVar(loopArgs[1], 'index') : undefined;
    return {
      depth: parent.depth + 1,
      indexVars: indexVar ? [...parent.indexVars, indexVar] : parent.indexVars,
      templateVars: [...parent.templateVars, itemVar, ...(indexVar ? [indexVar] : [])],
      conditionalInsideLoop,
    };
  }

  generateTemplate(
    schema: CardSchema,
    description: ICodegenDescription,
    isRootNode: boolean,
    schemaMethods: Methods,
    parentLoopScope: ILoopScope = EMPTY_LOOP_SCOPE,
  ): string {
    const result: string[] = [];
    const { componentName, loop, loopArgs = ['item'], condition, props = {}, children } = schema; // 子组件没有css属性，所以不解构

    // 判断是不是NgTemplate
    const isTemplate = this.registry.isNgTemplateComponent(componentName);

    if (this.registry.isEmptyTemplateNode(componentName, children)) {
      return '';
    }

    // 不是组件，而是文本节点，需单独处理
    if (componentName === 'Text' && !isRootNode) {
      return this.generateTextNode(props as Record<string, unknown>, description, parentLoopScope);
    }

    let component: string;
    if (isRootNode) {
      component = 'div';
    } else if (isTemplate) { // 因为使用ng-template不用记录import，所以不走下面的else分支
      component = 'ng-template';
    } else {
      // 组件名 → 宿主元素标签选择器
      component = this.registry.resolveComponentTag(componentName || 'div');
    }

    if (!isRootNode && componentName && !isTemplate) {
      // 用于记录要import 哪些组件
      description.componentSet.add(componentName);
    }

    const attrsArr: IAngularTemplateAttr[] = [];

    const extraAttrs = componentName && !isTemplate ? this.registry.resolveAttributeSelectors(componentName) : [];
    for (const { name, value } of extraAttrs) {
      // 带值的属性选择器(如 [type=text])必须连值一起输出,否则匹配不到该组件
      attrsArr.push(value === undefined ? { left: name } : { left: name, right: `"${value}"` });
    }

    // 处理循环渲染
    let ngForAttr: IAngularTemplateAttr | undefined;
    if (loop) {
      const loopData = (loop as { type?: string; value?: string }).type
        ? this.bindings.toTemplateValue(loop, description, parentLoopScope)
        : JSON.stringify(loop).replace(/"/g, '&quot;'); // loop 为字面量数组时的兜底序列化

      const itemVar = this.toLoopVar(loopArgs[0], 'item');
      const indexVar = loopArgs[1] ? this.toLoopVar(loopArgs[1], 'index') : undefined;
      const indexClause = indexVar ? `; let ${indexVar} = index` : '';
      ngForAttr = { left: '*ngFor', right: `"let ${itemVar} of ${loopData}${indexClause}"` };
    }

    // 处理条件渲染
    let ngIfAttr: IAngularTemplateAttr | undefined;
    if (typeof condition === 'object' || typeof condition === 'boolean') {
      const isObjectCondition = typeof condition === 'object' && condition !== null;
      const conditionObj = condition as { type?: string; value?: string; kind?: string };
      const conditionValue =
        isObjectCondition && conditionObj.type
          ? this.bindings.toTemplateValue(conditionObj, description, parentLoopScope)
          : condition;

      ngIfAttr = { left: '*ngIf', right: `"${conditionValue}"` };
    }

    // 同一元素上两个结构型指令互斥,故 *ngFor + *ngIf 时把 *ngIf 提升到外层 ng-container
    if (ngForAttr && ngIfAttr) {
      result.push(`\n<ng-container ${this.bindings.renderAttrs([ngIfAttr])}>`);
    }
    if (ngForAttr) {
      attrsArr.push(ngForAttr);
    } else if (ngIfAttr) {
      attrsArr.push(ngIfAttr);
    }

    result.push(`\n<${component} `);

    // 本节点及子节点可见的循环作用域:属性绑定与子树递归用的是同一份
    const loopScope = this.resolveLoopScope(loop, loopArgs, !!ngIfAttr, parentLoopScope);

    // 处理元素属性
    this.bindings.handleBinding(props as Record<string, unknown>, attrsArr, description, componentName, schemaMethods, loopScope);

    result.push(this.bindings.renderAttrs(attrsArr));

    if (this.registry.voidElements.includes(component)) { // 自闭合元素
      result.push(' />');
    } else { // 非自闭合元素
      result.push('>');

      // 递归处理子元素
      this.recurseChildren(children, description, result, schemaMethods, loopScope);
      // 节点的 slot 字段不产出:Angular 没有插槽概念,改由 NgTemplate + props.let 表达作用域模板
      result.push(`</${component}>`);
    }

    if (ngForAttr && ngIfAttr) {
      result.push('\n</ng-container>');
    }

    return result.join('');
  }
}
