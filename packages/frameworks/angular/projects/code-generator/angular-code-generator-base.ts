import type { CardSchema, NodeSchema } from '@opentiny/genui-sdk-core';
import { HTML_TAGS, JS_EXPRESSION, JS_FUNCTION, JS_SLOT, UNWRAP_QUOTES } from './constants';
import type {
  ICodeGeneratorParams,
  ICodegenDescription,
  ICodePanel,
  IAngularLibraryConfig,
  IAngularCodeGeneratorOptions,
  ICodeGeneratorResult,
} from './types';
import { capitalize, hyphenate, toEventKey, unwrapExpression } from './utils';
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

export class AngularCodeGeneratorBase extends CodeGeneratorBase {

  private readonly prettierOpts: Record<string, unknown>;

  constructor(
    protected readonly config: IAngularLibraryConfig,
    private readonly generatorOptions: IAngularCodeGeneratorOptions = {},
  ) {
    super();
    this.prettierOpts = {
      ...DEFAULT_PRETTIER_OPTS,
      ...(generatorOptions.prettierOpts ?? {}),
    };
  }

  protected templateActionNames: Set<string> = new Set();
  protected templateGeneratedMethods: string[] = [];
  private templateMethodCounter = 0;
  private slotTemplateCounter = 0;

  protected get voidElements(): string[] {
    return ['img', 'input', 'br', 'hr', 'link', ...(this.config.extraVoidElements ?? [])];
  }

  protected resolveComponentTag(componentName: string): string {
    return this.config.componentSelector[componentName] || hyphenate(componentName);
  }

  protected resolveExtraDirective(componentName: string): string | undefined {
    return this.config.componentExtraSelector?.[componentName];
  }

  /** 组件库识别:递归收集 schema 中出现的全部组件名(含原生 HTML 标签与 Text 等特殊节点) */
  protected collectSchemaComponentNames(schema: CardSchema): Set<string> {
    const names = new Set<string>();
    const walk = (node: unknown) => {
      if (!node || typeof node !== 'object') return;
      const item = node as NodeSchema;
      if (item.componentName) names.add(item.componentName);
      const children = item.children;
      if (Array.isArray(children)) children.forEach((child) => walk(child));
      else walk(children);
    };
    walk(schema);
    return names;
  }

  /** 当前组件库拥有的组件名集合,用于识别 schema 是否使用该库;子类可覆盖(如从物料包全量组件推导) */
  protected getLibraryComponentNames(): Set<string> {
    return new Set(Object.keys(this.config.componentSelector));
  }

  protected processLibrarySpecificProp(
    _componentName: string,
    _key: string,
    _rawItem: unknown,
    _props: Record<string, unknown>,
    _attrsArr: string[],
    _description: ICodegenDescription,
    _state: Record<string, unknown>,
    _schemaMethods?: Record<string, { value: string }>,
  ): boolean {
    return false;
  }

  protected processLibrarySpecificChildren(
    _componentName: string,
    _children: NodeSchema[] | NodeSchema | string | undefined,
  ): NodeSchema[] | NodeSchema | string | undefined {
    return undefined;
  }

  protected buildImports(
    description: ICodegenDescription,
    hasOutputs = false,
    hasLifecycle = false,
    hasSlot = false,
  ): { importStatements: string; moduleNames: string[] } {
    const { componentSet } = description;
    const componentsInUse = [...componentSet];

    const moduleNames: string[] = [];
    const seenModules = new Set<string>();

    componentsInUse.forEach((compName) => {
      const moduleName = this.config.moduleRefMap[compName];
      if (moduleName && !seenModules.has(moduleName)) {
        seenModules.add(moduleName);
        moduleNames.push(moduleName);
      }
    });

    const lines: string[] = [];

    const coreImports = ['Component'];
    if (hasOutputs) {
      coreImports.push('Output', 'EventEmitter');
    }
    if (hasLifecycle) {
      coreImports.push('OnInit');
    }
    if (hasSlot) {
      coreImports.push('ViewChild', 'TemplateRef');
    }
    lines.push(`import { ${coreImports.join(', ')} } from '@angular/core';`);
    lines.push("import { CommonModule } from '@angular/common';");
    lines.push("import { FormsModule } from '@angular/forms';");

    if (moduleNames.length > 0) {
      lines.push(`import { ${moduleNames.join(', ')} } from '${this.config.libraryPackage}';`);
    }

    return { importStatements: lines.join('\n'), moduleNames };
  }

  protected handleLiteralBinding(
    key: string,
    item: unknown,
    attrsArr: string[],
    description: ICodegenDescription,
    state: Record<string, unknown>,
  ): void {
    if (typeof item === 'string') {
      attrsArr.push(`${key}="${item.replace(/"/g, '&quot;')}"`);
      return;
    }

    if (item && typeof item === 'object') {
      const localInternalTypes = new Set<string>();
      description.internalTypes = localInternalTypes;

      this.traverseState(item as Record<string, unknown>, description, state);
      const requiresStateHoist =
        localInternalTypes.has('JSFunction') ||
        localInternalTypes.has('JSSlot');

      if (requiresStateHoist) { // 将函数提升到state中， JSSlot是什么
        if (localInternalTypes.has('JSSlot')) {
          // 含作用域插槽:render 引用 ng-template 的 TemplateRef,类字段初始化时机太早,
          // 必须提升为组件类字段,由 ngOnInit 组装(现有 hoistPropToState 的目标 state 是类字段,此时 this.slotN 还是 undefined)
          this.hoistPropToTemplateField(key, item, attrsArr, description);
        } else {
          this.hoistPropToState(key, item, attrsArr, state);
        }
        return;
      }
      const parsedValue = unwrapExpression(JSON.stringify(item)).replace(/props\./g, '');
      const safeExpr = parsedValue.replace(/'/g, '&#39;');
      attrsArr.push(`[${key}]='${safeExpr}'`);
      return;
    }

    attrsArr.push(`[${key}]="${item}"`);
  }

  protected handleEventBinding(
    key: string,
    item: { type?: string; value?: string; params?: string[] },
    schemaMethods?: Record<string, { value: string }>,
  ): string {
    const eventKey = toEventKey(key);

    if (item?.type === JS_FUNCTION) {
      const fnInfo = this.getFunctionInfo(item.value ?? '');  // 是否异步、参数、函数体
      if (!fnInfo) {
        return `(${eventKey})=""`;
      }

      // JSFunction类型的value值是匿名函数，需要加名字
      this.templateMethodCounter++;
      const methodName = `__handle${this.templateMethodCounter}`;

      const body = fnInfo.body.replace(/this\.props\./g, 'this.');

      // Vue 对齐：函数声明的形参名不再被当作自由变量重复注入
      const declaredParams = fnInfo.params; // declaredParams[0] = 
      const freeVars = this.extractFreeVariables(body).filter((v) => !declaredParams.includes(v)); // 循环变量作为参数
      const extendParams = item.params ?? [];

      // 方法形参 = 声明形参 + 模板自由变量 + 额外参数(去重,声明形参优先)
      const sigParams = [...new Set([...declaredParams, ...freeVars, ...extendParams])];
      // 模板调用：声明了形参时，第一个声明形参由 $event 填充（对齐 Vue 自动传事件参数）
      const templateArgs = [...new Set([...(declaredParams.length > 0 ? ['$event'] : []), ...freeVars, ...extendParams])];

      const returnType = fnInfo.type ? 'Promise<void>' : 'void';
      const asyncPrefix = fnInfo.type ? `${fnInfo.type} ` : '';
      // 形参声明为可选，容忍多声明形参时模板侧实参不足
      const paramsWithTypes = sigParams.length > 0
        ? sigParams.map((v) => `${v}?: any`).join(', ')
        : '';
      const methodSignature = paramsWithTypes
        ? `${asyncPrefix}${methodName}(${paramsWithTypes}): ${returnType}`
        : `${asyncPrefix}${methodName}(): ${returnType}`;
      this.templateGeneratedMethods.push(`${methodSignature} { ${body} }`);

      const callArgs = templateArgs.join(', ');
      return `(${eventKey})="${methodName}(${callArgs})"`;
    }

    if (item?.type !== JS_EXPRESSION) {
      return '';
    }

    const eventHandler = (item.value ?? '').replace(/this\.(props\.)?/g, '');
    if (/^\w+$/.test(eventHandler)) { // 不带括号， 判断函数定义有无参数， 有则传入事件对象
      if (schemaMethods && schemaMethods[eventHandler]) {
        const methodInfo = this.getFunctionInfo(schemaMethods[eventHandler].value);
        if (methodInfo && methodInfo.params.length > 0) {
          return `(${eventKey})="${eventHandler}($event)"`;
        }
      }
      return `(${eventKey})="${eventHandler}()"`;
    }
    // eventHandler应该是带括号的调用
    return `(${eventKey})="${eventHandler}"`;
  }

  protected handleSlotBinding(item: Record<string, unknown> | string): string {
    const { name } = (item as { name?: string }) ?? {};
    const slotName = name || (typeof item === 'string' ? item : 'default');
    // Angular 内容投影：具名插槽通过属性选择器匹配 <ng-content select="[slotName]">。
    // 默认插槽无需标记，返回空字符串。
    return slotName === 'default' ? '' : slotName;
  }

  protected handleBinding(
    props: Record<string, unknown>,
    attrsArr: string[],
    description: ICodegenDescription,
    state: Record<string, unknown>,
    componentName?: string,
    schemaMethods?: Record<string, { value: string }>,
  ): void {
    Object.entries(props).forEach(([rawKey, rawItem]) => {
      let key = rawKey === 'className' ? 'class' : rawKey;

      if (this.config.propBlacklist?.[componentName ?? '']?.includes(key)) { // 有时候ai会输出一些组件不存在的属性，把它们列在黑名单里
        return;
      }

      const rename = this.config.propRename?.[componentName ?? '']?.[key]; // ai输出的属性名合组件合法属性名不同 就要rename
      if (rename) {
        key = rename;
      }

      // 特殊属性处理
      if (this.processLibrarySpecificProp(componentName ?? '', key, rawItem, props, attrsArr, description, state, schemaMethods)) {
        return;
      }

      // === Common Angular logic below ===

      if (key === 'slot') { // 处理 当前组件投放到父组件的哪个插槽
        const slotAttr = this.handleSlotBinding(rawItem as Record<string, unknown> | string);
        if (slotAttr) {
          attrsArr.push(slotAttr);
        }
        return;
      }

      const item = rawItem as { type?: string; value?: string; model?: { prop?: string }; params?: string[] };
      const propType = this.resolvePropValueType(rawItem); // 'JSExpression' 'JSFunction' 'JSSlot'

      if (this.isOnEventKey(key)) {
        const eventBinding = this.handleEventBinding(key, item, schemaMethods);
        if (eventBinding) {
          attrsArr.push(eventBinding);
        }
        return;
      }

      if (propType === 'literal') {
        this.handleLiteralBinding(key, rawItem, attrsArr, description, state);
        return;
      }

      if (propType === JS_FUNCTION) {
        this.hoistPropToState(key, rawItem, attrsArr, state);
        return;
      }

      if (propType === JS_EXPRESSION) {
        if (item.model) {
          attrsArr.push(`[(ngModel)]="${(item.value ?? '').replace(/this\.(props\.)?/g, '')}"`);
          return;
        }
        attrsArr.push(`[${key}]="${(item.value ?? '').replace(/this\.(props\.)?/g, '')}"`);
      }
    });
  }

  protected recurseChildren(
    children: NodeSchema[] | NodeSchema | string | undefined,
    state: Record<string, unknown>,
    description: ICodegenDescription,
    result: string[],
    schemaMethods?: Record<string, { value: string }>,
  ): void {
    if (Array.isArray(children)) {
      result.push(
        children.map((child) => this.generateTemplate(child as CardSchema, state, description, false, schemaMethods)).join(''),
      );
      return;
    }
    result.push((children as string) || '');
  }

  protected generateSlotTemplate(
    item: Record<string, any>,
    description: ICodegenDescription,
    state: Record<string, unknown> = {},
    schemaMethods?: Record<string, { value: string }>,
  ): string {
    const result: string[] = [];
    const { componentName, component: componentAlias, props = {}, children, condition } = item;
    const comp = componentName || componentAlias || 'div';

    if (comp === 'Text') {
      const textProp = (props as Record<string, unknown>)['text'];
      if (textProp && typeof textProp === 'object' && (textProp as { type?: string }).type === 'JSExpression') {
        const textValue = (textProp as { value?: string }).value ?? '';
        return `{{ ${textValue.replace(/this\.(props\.)?/g, '')} }}`;
      }
      return `{{ ${(props as Record<string, unknown>)['text'] || ''} }}`;
    }

    const tag = this.resolveComponentTag(comp);
    description.componentSet.add(comp);

    const attrsArr: string[] = [];

    const extraDirective = this.resolveExtraDirective(comp);
    if (extraDirective) {
      attrsArr.push(extraDirective);
    }

    if (condition) {
      // Angular 模板没有 JSX 的表达式容器 { cond && ... },条件渲染用 *ngIf 结构指令
      const conditionValue =
        (condition as { type?: string; value?: string }).type
          ? (condition as { value?: string }).value?.replace(/this\./g, '') ?? condition
          : condition;
      attrsArr.push(`*ngIf="${conditionValue}"`);
    }

    result.push(`<${tag} `);
    this.handleBinding(props, attrsArr, description, state, comp, schemaMethods);
    result.push(attrsArr.join(' '));

    if (this.voidElements.includes(tag)) {
      result.push(' />');
    } else {
      result.push('>');
      if (Array.isArray(children)) {
        result.push(
          children.map((child) => this.generateSlotTemplate(child, description, state, schemaMethods)).join(''),
        );
      } else if ((children as { type?: string })?.type === 'JSExpression') {
        result.push(`{{ ${(children as { value?: string }).value?.replace(/this\./g, '') ?? ''} }}`);
      } else {
        result.push((children as string) || '');
      }
      result.push(`</${tag}>`);
    }

    return result.join('');
  }

  protected transformStateType(
    current: Record<string, any>,
    prop: string,
    description: ICodegenDescription,
    rootState: Record<string, any>,
  ): void {
    const stateEntry = current[prop];
    if (stateEntry?.accessor) {
      const getterValue = stateEntry.accessor.getter?.value ?? 'function() {}';
      const setterValue = stateEntry.accessor.setter?.value;
      const getterInfo = this.getFunctionInfo(getterValue);
      const setterInfo = setterValue ? this.getFunctionInfo(setterValue) : null;

      description.stateAccessors.push({
        name: prop,
        getterExpr: getterInfo
          ? `() => { ${getterInfo.body.replace(/this\.(props\.)?/g, '')} }`
          : `() => (${this.replaceThis(getterValue)})()`,
        setterExpr: setterInfo
          ? `(${setterInfo.params.join(',')}) => { ${setterInfo.body.replace(/this\.(props\.)?/g, '')} }`
          : undefined,
      });

      if (stateEntry.defaultValue !== undefined) {
        current[prop] = stateEntry.defaultValue;
      } else {
        delete current[prop];
      }
      return;
    }

    const builtInTypes = [JS_EXPRESSION, JS_FUNCTION, JS_SLOT];
    const { type } = current[prop] || {};
    if (!builtInTypes.includes(type)) {
      return;
    }

    description.internalTypes.add(type);
    const { start, end } = UNWRAP_QUOTES;

    if (type === JS_EXPRESSION) { // js表达式 加#QUOTES_START# 和 #QUOTES_END# 把js表达式结构对象转化为函数字符串
      const { value = '', computed = false } = current[prop] || {};
      current[prop] = computed
        ? `${start}computed(${value.replace(/this\./g, '')})${end}`
        : `${start}${value.replace(/this\./g, '')}${end}`;
      return;
    }

    if (type === JS_FUNCTION) { // 箭头函数化， 把函数结构对象转化为函数字符串
      const { value = '' } = current[prop] || {};
      const info = this.getFunctionInfo(value);
      if (!info) {
        current[prop] = `${start}${typeof value === 'string' ? value.replace(/this\./g, '') : ''}${end}`;
        return;
      }
      const inlineFunc = `${info.type} (${info.params.join(',')}) => { ${info.body.replace(/this\./g, '')} }`;
      current[prop] = `${start}${inlineFunc}${end}`;
      return;
    }
    // JSSlot
    const { value = [], params = ['row'] } = current[prop] || {};
    // 生成 Angular 原生的 ng-template 片段(可编译),运行时通过 TemplateRef 引用。
    // 作用域参数(params)映射为 ng-template 的 let- 声明,模板体内可直接引用。
    const slotRef = `slot${this.slotTemplateCounter++}`;
    const slotBody = (value as any[]).map((item) => this.generateSlotTemplate(item, description, rootState)).join(''); // value可能不是数组呢？
    const slotTemplates = description.slotTemplates ?? (description.slotTemplates = []);
    slotTemplates.push({ ref: slotRef, params, body: slotBody });
    // 用 QUOTES 标记包裹 this.slotN:JSON.stringify 后由 unwrapExpression 还原为对 TemplateRef 字段的引用
    current[prop] = `${start}this.${slotRef}${end}`;
  }

  protected traverseState(
    state: Record<string, any> | any[] | null,
    description: ICodegenDescription,
    rootState: Record<string, any>,
  ): void {
    if (typeof state !== 'object' || state === null) {
      return;
    }
    if (Array.isArray(state)) {
      state.forEach((item) => this.traverseState(item, description, rootState));
      return;
    }
    Object.keys(state).forEach((prop) => {
      if (Object.prototype.hasOwnProperty.call(state, prop)) {
        this.transformStateType(state, prop, description, rootState);
        this.traverseState(state[prop], description, rootState);
      }
    });
  }

  protected generateTemplate(
    schema: CardSchema,
    state: Record<string, any>,
    description: ICodegenDescription,
    isRootNode = true,
    schemaMethods?: Record<string, { value: string }>,
  ): string {
    const result: string[] = [];
    const { componentName, loop, loopArgs = ['item'], condition, props = {}, children, slot } = schema; // 子组件没有css属性，所以不解构

    if (this.isEmptySlotNode(componentName, children)) {
      return '';
    }

    if (componentName === 'Text' && !isRootNode) {
      const textProp = (props as Record<string, unknown>)['text'];
      if (textProp && typeof textProp === 'object' && (textProp as { type?: string }).type === 'JSExpression') {
        const textValue = (textProp as { value?: string }).value ?? '';
        return `{{ ${textValue.replace(/this\.(props\.)?/g, '')} }}`;
      }
      const text = (props as Record<string, unknown>)['text'];
      const escaped = String(text ?? '').replace(/'/g, "\\'");
      return `{{ '${escaped}' || '' }}`;
    }

    let component: string;
    if (isRootNode) {
      component = 'div';
    } else {
      component = this.resolveComponentTag(componentName || 'div'); // 组件名 → HTML 标签选择器，如 { TiButton: 'button', TiSelect: 'ti-select' }
    }

    if (!isRootNode && componentName) {
      description.componentSet.add(componentName); // 用于记录要import 哪些组件
    }

    const attrsArr: string[] = [];

    const extraDirective = componentName ? this.resolveExtraDirective(componentName) : undefined;
    if (extraDirective) {
      attrsArr.push(extraDirective);
    }

    // 处理循环渲染
    let ngForAttr = '';
    if (loop) {
      const loopData = (loop as { type?: string; value?: string }).type
        ? ((loop as { value?: string }).value ?? '').replace(/this\.(props\.)?/g, '')
        : JSON.stringify(loop).replace(/"/g, '&quot;'); // loop为数组的情况，应该不存在，存疑 schema中是否有这种情况 let item of [{"label":"A"}]

      const itemVar = loopArgs[0] || 'item';
      const indexVar = loopArgs[1];
      const indexClause = indexVar ? `; let ${indexVar} = index` : '';
      ngForAttr = `*ngFor="let ${itemVar} of ${loopData}${indexClause}"`;
    }

    // 处理条件渲染
    let ngIfAttr = '';
    if (typeof condition === 'object' || typeof condition === 'boolean') {
      const isObjectCondition = typeof condition === 'object' && condition !== null;
      const conditionObj = condition as { type?: string; value?: string; kind?: string };
      const conditionValue =
        isObjectCondition && conditionObj.type
          ? (conditionObj.value ?? '').replace(/this\.(props\.)?/g, '')
          : condition;

      ngIfAttr = `*ngIf="${conditionValue}"`

      // const kind = isObjectCondition ? (conditionObj.kind || 'if') : 'if'; // schema协议中似乎并没有 kind
      // if (kind === 'show') {
      //   attrsArr.push(`[hidden]="!(${conditionValue})"`);
      // } else if (kind === 'else') {
      //   attrsArr.push(`*ngIf="!(${conditionValue})"`);
      // } else {
      //   attrsArr.push(`*ngIf="${conditionValue}"`);
      // }
    }

    // Angular 不允许同一元素上同时使用 *ngIf 与 *ngFor 两个结构型指令。
    // 两者共存时，将 *ngFor 提升到外层 <ng-container> 上，元素本身保留 *ngIf。
    const wrapNgFor = Boolean(ngForAttr && ngIfAttr);
    if (wrapNgFor) {
      result.push(`\n<ng-container ${ngForAttr}>`);
    } else if (ngForAttr) {
      attrsArr.push(ngForAttr);
    }
    if (ngIfAttr) {
      attrsArr.push(ngIfAttr);
    }

    result.push(`\n<${component} `);

    this.handleBinding(props as Record<string, unknown>, attrsArr, description, state, componentName, schemaMethods);
    result.push(attrsArr.join(' '));

    if (this.voidElements.includes(component)) { // 自闭合元素
      result.push(' />');
    } else {
      result.push('>');

      const transformedChildren = this.processLibrarySpecificChildren(componentName ?? '', children); // 让子类实现，做库特定的预处理
      this.recurseChildren(
        transformedChildren ?? children as NodeSchema[] | NodeSchema | string | undefined,
        state,
        description,
        result,
        schemaMethods,
      );
      result.push(this.generateSlotContent(slot, state, description, schemaMethods));
      result.push(`</${component}>`);
    }

    if (wrapNgFor) {
      result.push('\n</ng-container>');
    }

    return result.join('');
  }

  /**
   * 生成插槽渲染内容（顶层 slot 字段）。
   *
   * 协议中 slot 支持三种形态：
   *  - string：默认插槽内容，直接输出
   *  - JSSlot 包装：解包 value 后递归
   *  - Record 具名插槽映射：{ header: "...", footer: "..." }，每个 key 生成一个投影容器
   *  - 数组：插槽内容为组件列表，递归调用 generateTemplate 生成 Angular 模板
   */
  protected generateSlotContent(
    slot: unknown,
    state: Record<string, unknown>,
    description: ICodegenDescription,
    schemaMethods?: Record<string, { value: string }>,
  ): string {
    if (slot == null || slot === '') {
      return '';
    }

    // 字符串 → 默认插槽内容
    if (typeof slot === 'string') {
      return slot;
    }

    // 数组 → 插槽内容为组件列表（递归生成 Angular 模板）
    if (Array.isArray(slot)) {
      return slot
        .map((item) =>
          typeof item === 'string'
            ? item
            : this.generateTemplate(item as CardSchema, state, description, false, schemaMethods),
        )
        .join('');
    }

    if (typeof slot !== 'object') {
      return '';
    }

    // JSSlot 包装 → 解包 value 后递归
    if ((slot as { type?: string }).type === JS_SLOT) {
      return this.generateSlotContent((slot as { value?: unknown }).value, state, description, schemaMethods);
    }

    // 具名插槽映射 { header: "...", footer: "..." } → 每个 key 生成一个投影容器
    return Object.entries(slot as Record<string, unknown>)
      .map(([slotName, content]) => this.generateNamedSlot(slotName, content, state, description, schemaMethods))
      .join('');
  }

  /**
   * 生成单个具名插槽。Angular 内容投影中具名插槽通过属性选择器匹配
   * <ng-content select="[slotName]">，因此用带属性的容器包裹插槽内容。
   */
  protected generateNamedSlot(
    slotName: string,
    content: unknown,
    state: Record<string, unknown>,
    description: ICodegenDescription,
    schemaMethods?: Record<string, { value: string }>,
  ): string {
    const body = this.generateSlotContent(content, state, description, schemaMethods);
    return `\n<div ${slotName}>${body}</div>`;
  }

  protected buildStateFields(schema: CardSchema, description: ICodegenDescription): string {
    const { state = {} } = (schema as CardSchema & { state?: Record<string, unknown> });
    this.traverseState(state as Record<string, any>, description, state);
    const stateStr = unwrapExpression(JSON.stringify(state, null, 2));
    if (!stateStr || stateStr === '{}') {
      return '';
    }
    return `state = ${stateStr};`;
  }

  protected buildMethods(schema: CardSchema): string {
    const { methods = {} } = (schema as CardSchema & { methods?: Record<string, { value: string }> });
    const methodLines = Object.entries(methods).map(([key, item]) => {
      const info = this.getFunctionInfo(item.value);
      if (!info) {
        const body = item.value.replace(/this\.props\./g, 'this.');
        return `${key} = ${body};`;
      }
      const asyncPrefix = info.type ? `${info.type} ` : '';
      const methodName = asyncPrefix && key.startsWith(asyncPrefix.trim())
        ? key.slice(asyncPrefix.length)
        : key;
      const body = info.body.replace(/this\.props\./g, 'this.');
      const returnType = info.type ? 'Promise<void>' : 'void';
      return `${asyncPrefix}${methodName}(${info.params.join(', ')}): ${returnType} { ${body} }`;
    });
    return methodLines.join('\n\n  ');
  }

  protected buildAngularComponentSource({
    schema,
    name,
  }: {
    schema: CardSchema;
    name?: string;
  }): string {
    const codegenMeta = this.createCodegenMeta(); // {componentSet: ,  internalTypes: , stateAccessors: , iconComponents: ,}
    this.templateGeneratedMethods = [];
    this.templateMethodCounter = 0;

    const schemaMethods = (schema as CardSchema & { methods?: Record<string, { value: string }> }).methods;
    // 与 Vue 出码一致：整体检测 schema 是否使用 callAction，命中则保留调用并注入占位实现
    const needsCallAction = /\bthis\.callAction\b/.test(JSON.stringify(schema));

    const template = this.generateTemplate(
      schema,
      schema.state as Record<string, any>,
      codegenMeta,
      true,
      schemaMethods
    );

    // 收集到的 JSSlot → ng-template 片段,追加到组件模板末尾(Angular 编译器可正常编译其内容)
    const slotTemplates = (codegenMeta.slotTemplates ?? [])
      .map(({ ref, params, body }) => `\n<ng-template #${ref} ${params.map((p) => `let-${p}`).join(' ')}>\n${body}\n</ng-template>`)
      .join('');
    const finalTemplate = `${template}${slotTemplates}`;

    // ng-template 引用声明 + 含 JSSlot 属性的组件类字段声明
    const viewChildDecls = (codegenMeta.slotTemplates ?? [])
      .map(({ ref }) => `@ViewChild('${ref}', { static: true }) ${ref}!: TemplateRef<any>;`)
      .join('\n\n  ');
    const slotFieldDecls = (codegenMeta.slotFields ?? [])
      .map(({ fieldName }) => `${fieldName}: any = [];`)
      .join('\n  ');

    const stateFields = this.buildStateFields(schema, codegenMeta);

    const methods = this.buildMethods(schema);

    const lifeCycles = (schema as CardSchema & { lifeCycles?: Record<string, { type?: string; value?: string }> }).lifeCycles;
    let lifecycleBody = '';
    if (lifeCycles?.onMounted) {
      const mountedFn = lifeCycles.onMounted;
      const fnInfo = this.getFunctionInfo(mountedFn.value ?? '');
      if (fnInfo) {
        lifecycleBody = fnInfo.body.replace(/this\.props\./g, 'this.');
      }
    }

    // JSSlot 组装:含作用域插槽的属性提升为类字段,在 ngOnInit 里把占位引用(this.slotN)替换成 ng-template 的 TemplateRef
    const slotFieldInits = (codegenMeta.slotFields ?? [])
      .map(({ fieldName, item }) => `this.${fieldName} = ${unwrapExpression(JSON.stringify(item))};`)
      .join('\n    ');

    const initBody = [lifecycleBody, slotFieldInits].filter(Boolean).join('\n    ');
    const lifecycleMethods = initBody ? `ngOnInit(): void {\n    ${initBody}\n  }` : '';

    const hasLifecycle = !!lifecycleMethods;
    const hasSlot = (codegenMeta.slotTemplates?.length ?? 0) > 0;
    const { importStatements, moduleNames } = this.buildImports(codegenMeta, false, hasLifecycle, hasSlot);

    const selectorName = hyphenate(name || 'SchemaCard');
    const className = capitalize(name || 'SchemaCard');
    const ngImports = ['CommonModule', 'FormsModule', ...moduleNames].join(', ');
    const implementsClause = hasLifecycle ? ' implements OnInit' : '';

    // callAction 保留为 this.callAction(...) 调用，运行时通过 customActions 注入实现
    const callActionMethod = needsCallAction
      ? 'callAction(name: string, params?: unknown): void {\n' +
        '    console.warn(`[GenUI] callAction("${name}") is available at runtime via customActions; implement it for exported code.`, params);\n' +
        '  }'
      : '';

    const generatedMethods = this.templateGeneratedMethods.join('\n');
    const classBody = [viewChildDecls, stateFields, slotFieldDecls, generatedMethods, lifecycleMethods, methods, callActionMethod].filter(Boolean).join('\n\n  ');

    return [
      importStatements,
      '',
      '@Component({',
      `  selector: 'app-${selectorName}',`,
      '  standalone: true,',
      `  imports: [${ngImports}],`,
      `  template: \`${finalTemplate}\`,`,
      '  styles: [``],',
      '})',
      `export class ${className}Component${implementsClause} {`,
      classBody ? `  ${classBody}` : '',
      '}',
    ].join('\n');
  }

  protected buildJSFunctionExpression(value: string): string {
    const info = this.getFunctionInfo(value);
    if (!info) {
      return this.replaceThis(value);
    }
    const asyncPrefix = info.type ? `${info.type} ` : '';
    let body = info.body;
    body = body.replace(/this\.props\./g, 'this.');
    return `${asyncPrefix}(${info.params.join(',')}) => { ${body} }`;
  }

  protected hoistPropToState(key: string, item: unknown, attrsArr: string[], state: Record<string, unknown>): void {
    const valueKey = this.avoidDuplicateString(Object.keys(state), key);
    state[valueKey] = item; // 后面 buildStateFields 会再遍历一遍 state 处理{type: , value: }中的type
    attrsArr.push(`[${key}]="state.${valueKey}"`);
  }

  /**
   * 含 JSSlot 的属性提升:属性值提升为组件类字段(而非 state 字段)。
   * 因为属性值里的 render 是对 ng-template 的 TemplateRef 引用(this.slotN),
   * 而类字段初始化器执行时 ViewChild 尚未解析,必须延迟到 ngOnInit 组装。
   * 由 buildAngularComponentSource 生成组装逻辑。
   */
  protected hoistPropToTemplateField(
    key: string,
    item: unknown,
    attrsArr: string[],
    description: ICodegenDescription,
  ): void {
    const slotFields = description.slotFields ?? (description.slotFields = []);
    const fieldName = this.avoidDuplicateString(slotFields.map((f) => f.fieldName), key);
    slotFields.push({ fieldName, item: item as Record<string, unknown> });
    attrsArr.push(`[${key}]="${fieldName}"`);
  }

  /**
   * 用 prettier 格式化生成出的 .component.ts。Angular 出码产物是单个 TS 文件,
   * inline template 是 backtick 字符串字面量,typescript parser 不会格式化其内部,
   * 故采用两段式:
   *   1. 抽出 template 内容,以 parser 'angular'(prettier html 插件提供)格式化;
   *   2. 把格式化后的模板按 6 空格缩进嵌回,再整体以 parser 'typescript' 格式化。
   * 任一步失败都回退返回原始 source(与 Vue 出码行为一致)。
   */
  protected async formatWithPrettier(source: string, prettierOpts: Record<string, unknown>): Promise<string> {
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
        // 模板内容从第 0 列开始,嵌回时每行补 6 空格与 template: 对齐
        const indentedTemplate = formattedTemplate
          .trimEnd()
          .split('\n')
          .map((line: string) => `      ${line}`)
          .join('\n');
        formatted = source.replace(
          /template: `([\s\S]*?)`,/,
          `template: \`\n${indentedTemplate}\n  \`,`,
        );
      }

      // 2) 整体格式化外层 TS 结构
      return await format(formatted, {
        ...prettierOpts,
        parser: 'typescript',
        plugins: [typescriptPlugin, estreePlugin],
      });
    } catch {
      return source;
    }
  }

  override async generate({ pageInfo, formatWithPrettier = true }: ICodeGeneratorParams): Promise<ICodeGeneratorResult> {
    const { schema: originSchema, name = 'SchemaCard' } = pageInfo;

    const schema = JSON.parse(JSON.stringify(this.normalizeIncomingSchema(originSchema))) as CardSchema;
    const angularCode = this.buildAngularComponentSource({ schema, name });
    const panelName = `${hyphenate(name)}.component.ts`;
    const compileErrors: { message: string }[] = [];

    // 组件库识别:校验 schema 用到的组件是否都属于当前组件库(排除原生 HTML 标签与特殊节点)
    const usedComponents = this.collectSchemaComponentNames(schema);
    const knownComponents = this.getLibraryComponentNames();
    const unknownComponents = [...usedComponents].filter(
      (c) => !HTML_TAGS.has(c) && !['Text', 'Page', 'SchemaCard'].includes(c) && !knownComponents.has(c),
    );
    if (unknownComponents.length) {
      compileErrors.push({
        message: `组件库识别:以下组件不属于当前组件库,请检查 schema:${unknownComponents.join(', ')}`,
      });
    }

    const panel: ICodePanel = {
      panelName,
      panelValue: angularCode,
      panelType: 'angular',
      prettierOpts: { ...this.prettierOpts },
      type: 'page',
    };
    const result: ICodeGeneratorResult = { ...panel, errors: compileErrors };
    if (formatWithPrettier) {
      result.panelValue = await this.formatWithPrettier(result.panelValue, result.prettierOpts);
    }
    return result;
  }
}
