import type { CardSchema, JSFunction, Methods, NodeSchema } from '@opentiny/genui-sdk-core';
import { HTML_TAGS, JS_EXPRESSION, JS_FUNCTION, JS_SLOT, UNWRAP_QUOTES } from './constants';
import type {
  ICodeGeneratorParams,
  ICodegenDescription,
  ICodePanel,
  IAngularLibraryConfig,
  IAngularCodeGeneratorOptions,
  AngularBindingKind,
  IAngularTemplateAttr,
  IAngularClassSectionDefinition,
  ICodeGeneratorResult,
} from './types';
import type { IAngularPropContext } from './libraries/prop-adapter';
import { TINYNG_CONFIG } from './libraries/tinyng/config';
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

/** 缺省激活的组件库:未传 options.libraries 或传空数组时启用 */
const DEFAULT_LIBRARIES: IAngularLibraryConfig[] = [TINYNG_CONFIG];

export class AngularCodeGenerator extends CodeGeneratorBase {

  /** 激活的组件库(数组顺序即路由优先级),缺省仅内置 TinyNG;多库混合出码时按组件名路由(resolveConfig) */
  protected readonly libraryConfigs: readonly IAngularLibraryConfig[];
  private readonly prettierOpts: Record<string, unknown>;

  constructor(options: IAngularCodeGeneratorOptions = {}) {
    super();

    this.libraryConfigs = [...(options.libraries?.length ? options.libraries : DEFAULT_LIBRARIES)];
    this.prettierOpts = {
      ...DEFAULT_PRETTIER_OPTS,
      ...(options.prettierOpts ?? {}),
    };
  }

  /** 组件名 → 激活库配置。单库直接返回;多库按激活顺序查,首个命中该组件的库胜出;未命中兜底第一个库 */
  protected resolveConfig(componentName: string): IAngularLibraryConfig {
    if (this.libraryConfigs.length === 1) return this.libraryConfigs[0];
    for (const config of this.libraryConfigs) {
      if (
        config.libraryComponents?.has(componentName) ||
        config.componentSelector[componentName] ||
        config.moduleRefMap[componentName]
      ) {
        return config;
      }
    }
    return this.libraryConfigs[0];
  }

  /** 创建出码器;未指定 libraries 时默认启用内置 TinyNG,传多库数组可混合出码 */
  static create(options: IAngularCodeGeneratorOptions = {}): AngularCodeGenerator {
    return new AngularCodeGenerator(options);
  }

  /** 默认(opentiny-ng)出码入口,对外保持唯一 API */
  static generateCode(params: ICodeGeneratorParams): Promise<ICodeGeneratorResult> {
    return new AngularCodeGenerator().generate(params);
  }

  protected get voidElements(): string[] {
    const extra = new Set<string>();
    for (const config of this.libraryConfigs) {
      for (const tag of config.extraVoidElements ?? []) extra.add(tag);
    }
    return ['img', 'input', 'br', 'hr', 'link', ...extra];
  }

  protected resolveComponentTag(componentName: string): string {
    return this.resolveConfig(componentName).componentSelector[componentName] || hyphenate(componentName);
  }

  protected resolveExtraDirective(componentName: string): string | undefined {
    return this.resolveConfig(componentName).componentExtraSelector?.[componentName];
  }

  /** 以临时 internalTypes 集合执行 fn,结束后恢复外层集合,避免借道改写共享引用 */
  protected withLocalInternalTypes<T>(
    description: ICodegenDescription,
    fn: (localTypes: Set<string>) => T,
  ): T {
    const prev = description.internalTypes;
    description.internalTypes = new Set(prev);
    try {
      return fn(description.internalTypes);
    } finally {
      description.internalTypes = prev;
    }
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

  /** 当前组件库拥有的组件名集合,用于识别 schema 是否使用该库;缺省取 componentSelector 的键,物料包全量组件经 config 注入 */
  protected getLibraryComponentNames(): Set<string> {
    const merged = new Set<string>();
    for (const config of this.libraryConfigs) {
      const libSet = config.libraryComponents ?? new Set(Object.keys(config.componentSelector));
      for (const name of libSet) merged.add(name);
    }
    return merged;
  }

  /** 库专属 prop 特判:按 config.propAdapters 顺序尝试,首个命中者消费该 prop(见 libraries/prop-adapter.ts) */
  protected processLibrarySpecificProp(
    componentName: string,
    key: string,
    rawItem: unknown,
    props: Record<string, unknown>,
    attrsArr: IAngularTemplateAttr[],
    description: ICodegenDescription,
    state: Record<string, unknown>,
    schemaMethods: Methods,
  ): boolean {
    const adapters = this.resolveConfig(componentName).propAdapters ?? [];
    if (!adapters.length) {
      return false;
    }
    const ctx: IAngularPropContext = {
      componentName,
      key,
      rawItem,
      props,
      attrsArr,
      description,
      state,
      schemaMethods,
      resolvePropValueType: (value) => this.resolvePropValueType(value),
      replaceThis: (value) => this.replaceThis(value),
    };
    return adapters.some((adapter) => adapter.tryHandle(ctx));
  }

  /** 库专属 children 变换,经 config.transformChildren 注入(见 types.ts);未配置时原样返回 */
  protected processLibrarySpecificChildren(
    componentName: string,
    children: NodeSchema[] | NodeSchema | string | undefined,
  ): NodeSchema[] | NodeSchema | string | undefined {
    return this.resolveConfig(componentName).transformChildren?.(componentName, children);
  }

  protected buildImports(
    description: ICodegenDescription,
    needs: {
      /** 组件是否声明了 @Output(当前恒为 false,保留给后续事件输出) */
      outputs?: boolean;
      /** 是否产出 ngOnInit */
      init?: boolean;
      /** 是否产出 ngOnDestroy */
      destroy?: boolean;
      /** 是否产出 ViewChild / TemplateRef(即含 JSSlot) */
      slot?: boolean;
    } = {},
  ): { importStatements: string; moduleNames: string[] } {
    const { componentSet } = description;
    const componentsInUse = [...componentSet];

    const moduleNames: string[] = [];
    const seenModules = new Set<string>();
    // 多组件库时模块按所属 npm 包分组,每个包生成一条 import;单库退化为原单行
    const modulesByPackage = new Map<string, string[]>();

    componentsInUse.forEach((compName) => {
      const cfg = this.resolveConfig(compName);
      const moduleName = cfg.moduleRefMap[compName];
      if (!moduleName || seenModules.has(moduleName)) return;
      seenModules.add(moduleName);
      moduleNames.push(moduleName);
      let list = modulesByPackage.get(cfg.libraryPackage);
      if (!list) {
        list = [];
        modulesByPackage.set(cfg.libraryPackage, list);
      }
      list.push(moduleName);
    });

    const lines: string[] = [];

    const coreImports = ['Component'];
    if (needs.outputs) {
      coreImports.push('Output', 'EventEmitter');
    }
    if (needs.init) {
      coreImports.push('OnInit');
    }
    if (needs.destroy) {
      coreImports.push('OnDestroy');
    }
    if (needs.slot) {
      coreImports.push('ViewChild', 'TemplateRef');
    }
    lines.push(`import { ${coreImports.join(', ')} } from '@angular/core';`);
    lines.push("import { CommonModule } from '@angular/common';");
    lines.push("import { FormsModule } from '@angular/forms';");

    for (const [pkg, mods] of modulesByPackage) {
      lines.push(`import { ${mods.join(', ')} } from '${pkg}';`);
    }

    return { importStatements: lines.join('\n'), moduleNames };
  }

  /** 协议对象 → 模板表达式:取 value 并清洗 this. 前缀,value 缺失时兜底空串 */
  protected toTemplateValue(item: { value?: string } | null | undefined): string {
    return this.replaceThis(item?.value ?? '');
  }

  /**
   * 右值统一入口:任意形态的右值(schema 协议对象 / 字面量 / 函数)→ 属性等号右侧的完整片段(含引号与转义)。
   * 返回 null 表示该属性不产出。
   * 提升类副作用也在此完成:JSFunction → state 字段,JSSlot → 模板字段,返回值即引用它们的表达式。
   */
  protected resolveBindingRight(
    kind: AngularBindingKind,
    key: string,
    rawValue: unknown,
    propType: string,
    description: ICodegenDescription,
    state: Record<string, unknown>,
    schemaMethods: Methods,
  ): string | null {
    // 静态属性:字面量字符串原样落属性值,转义双引号
    if (kind === 'static') {
      return `"${String(rawValue).replace(/"/g, '&quot;')}"`;
    }

    if (kind === 'event') {
      const handler = this.handleEventBinding(
        rawValue as { type?: string; value?: string; params?: string[] },
        description,
        schemaMethods,
      );
      return handler === null ? null : `"${handler}"`;
    }

    // 直接以 JSSlot 形态出现的 prop 不产出绑定(保持原有分派结果)
    if (propType === JS_SLOT) {
      return null;
    }

    // 函数提升进根节点的 methods
    if (propType === JS_FUNCTION) {
      return `"${this.hoistPropToMethod(key, rawValue as JSFunction, schemaMethods, description)}"`;
    }

    if (propType === JS_EXPRESSION) {
      return `"${this.toTemplateValue(rawValue as { value?: string })}"`;
    }

    // 剩余为字面量值，对象字面量需先探查是否内含 JSFunction / JSSlot
    if (rawValue && typeof rawValue === 'object') {
      const localInternalTypes = this.withLocalInternalTypes(description, (localTypes) => {
        this.traverseState(rawValue as Record<string, unknown>, description, state, schemaMethods ?? {});
        return localTypes;
      });

      if (localInternalTypes.has('JSSlot')) {
        // 含作用域插槽: 引用 ng-template 的 TemplateRef,类字段初始化时机太早,
        // 提升为组件类字段,由 ngOnInit 组装(现有 hoistPropToState 的目标 state 是类字段,此时 this.slotN 还是 undefined)
        return `"${this.hoistPropToTemplateField(key, rawValue, description)}"`;
      }
      if (localInternalTypes.has('JSFunction')) {
        return `"${this.hoistPropToState(key, rawValue, state)}"`;
      }

      const parsedValue = unwrapExpression(JSON.stringify(rawValue)).replace(/props\./g, '');
      return `'${parsedValue.replace(/'/g, '&#39;')}'`;
    }

    return `"${rawValue}"`;
  }

  /**
   * 事件右值:JSFunction 提升为 __handleN 类方法;JSExpression 直接作为处理函数表达式。
   * 只产出等号右侧的处理函数片段(事件名由左值的 renderBindingLeft 生成);
   * `''` 表示空绑定 `(k)=""`,null 表示该属性不产出。
   */
  protected handleEventBinding(
    item: { type?: string; value?: string; params?: string[] },
    description: ICodegenDescription,
    schemaMethods: Methods,
  ): string | null {
    if (item?.type === JS_FUNCTION) {
      const fnInfo = this.getFunctionInfo(item.value ?? '');  // 是否异步、参数、函数体
      if (!fnInfo) {
        return '';
      }

      // JSFunction类型的value值是匿名函数，需要加名字。计数器走元数据，保证每次出码从 0 开始
      description.templateMethodCounter++;
      const methodName = `__handle${description.templateMethodCounter}`;

      const body = fnInfo.body;

      const declaredParams = fnInfo.params; // 声明形参
      const freeVars = this.extractFreeVariables(body).filter((v) => !declaredParams.includes(v)); // 模板自由变量 （循环变量作为参数）
      const extendParams = item.params ?? []; // 额外参数

      // 方法形参 = 声明形参 + 模板自由变量 + 额外参数
      const sigParams = [...new Set([...declaredParams, ...freeVars, ...extendParams])];
      // 模板调用：声明了形参时，第一个声明形参由 $event 填充
      const templateArgs = [...new Set([...(declaredParams.length > 0 ? ['$event'] : []), ...freeVars, ...extendParams])];

      const asyncPrefix = fnInfo.type ? `${fnInfo.type} ` : '';

      const paramsWithTypes = sigParams.length > 0
        ? sigParams.map((v) => `${v}?: any`).join(', ')
        : '';

      const methodSignature = paramsWithTypes
        ? `${asyncPrefix}${methodName}(${paramsWithTypes})`
        : `${asyncPrefix}${methodName}()`;
      description.templateGeneratedMethods.push(`${methodSignature} { ${body} }`);

      const callArgs = templateArgs.join(', ');
      return `${methodName}(${callArgs})`;
    }

    if (item?.type !== JS_EXPRESSION) {
      return null;
    }

    const eventHandler = this.toTemplateValue(item);
    if (/^\w+$/.test(eventHandler)) { // 不带括号， 判断函数定义有无参数， 有则传入事件对象
      if (schemaMethods && schemaMethods[eventHandler]) {
        const methodInfo = this.getFunctionInfo(schemaMethods[eventHandler].value);
        if (methodInfo && methodInfo.params.length > 0) {
          return `${eventHandler}($event)`;
        }
      }
      return `${eventHandler}()`;
    }
    // eventHandler是带括号的调用
    return eventHandler;
  }

  /**
   * 绑定形态判定(只决定左值括号,不看右值怎么算):
   * 事件看 `on` 前缀;双向看值内 `model` 标记;字面量字符串走静态属性,其余一律走属性绑定
   * (JSFunction / JSSlot 值先提升为 state 或模板字段,产物仍是属性绑定)。
   */
  protected resolveBindingKind(key: string, propType: string, rawValue: unknown): AngularBindingKind {
    if (this.isOnEventKey(key)) return 'event';
    if (propType === 'literal') return typeof rawValue === 'string' ? 'static' : 'property';
    if (propType === JS_EXPRESSION) {
      return (rawValue as { model?: unknown } | null)?.model ? 'twoWay' : 'property';
    }
    return 'property';
  }

  /** 左值渲染:方括号=属性绑定,圆括号=事件绑定,方括号+圆括号=双向绑定,无括号=静态属性 */
  protected renderBindingLeft(kind: AngularBindingKind, key: string): string {
    switch (kind) {
      case 'static':
        return key;
      case 'property':
        return `[${key}]`;
      case 'twoWay':
        return `[(${key})]`;
      case 'event':
        return `(${toEventKey(key)})`;
    }
  }

  /**
   * 已收集的模板属性 → 拼进开标签的字符串(唯一的拼接点)。
   * right 缺省即无值指令,只出名字(如原生元素上的 tiButton)。
   */
  protected renderAttrs(attrs: IAngularTemplateAttr[]): string {
    return attrs
      .map((attr) => (attr.right === undefined ? attr.left : `${attr.left}=${attr.right}`))
      .join(' ');
  }

  protected handleBinding(
    props: Record<string, unknown>,
    attrsArr: IAngularTemplateAttr[],
    description: ICodegenDescription,
    state: Record<string, unknown>,
    componentName: string,
    schemaMethods: Methods,
  ): void {
    Object.entries(props).forEach(([rawKey, rawValue]) => {
      let key = rawKey === 'className' ? 'class' : rawKey;

      // 组件所属库配置(黑名单/重命名按库生效)
      const cfg = this.resolveConfig(componentName ?? '');

      // 有时候ai会输出一些组件不存在的属性，把它们列在黑名单里
      if (cfg.propBlacklist?.[componentName ?? '']?.includes(key)) {
        return;
      }

      // ai输出的属性名和组件合法属性名不同 就要rename
      const rename = cfg.propRename?.[componentName ?? '']?.[key];
      if (rename) {
        key = rename;
      }

      // 特殊属性处理
      if (this.processLibrarySpecificProp(componentName ?? '', key, rawValue, props, attrsArr, description, state, schemaMethods)) {
        return;
      }

      // === Common Angular logic below ===
      // 左值决定括号,右值统一由 resolveBindingRight 产出(内部覆盖字面量/表达式/函数/插槽)
      const propType = this.resolvePropValueType(rawValue); // 'JSExpression' 'JSFunction' 'JSSlot'
      const kind = this.resolveBindingKind(key, propType, rawValue);
      const right = this.resolveBindingRight(kind, key, rawValue, propType, description, state, schemaMethods);
      if (right === null) {
        return;
      }
      attrsArr.push({ left: this.renderBindingLeft(kind, key), right });
    });
  }

  protected recurseChildren(
    children: NodeSchema[] | NodeSchema | string | undefined,
    state: Record<string, unknown>,
    description: ICodegenDescription,
    result: string[],
    schemaMethods: Methods,
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
    state: Record<string, unknown>,
    schemaMethods: Methods,
  ): string {
    const result: string[] = [];
    const { componentName, component: componentAlias, props = {}, children, condition } = item;
    const comp = componentName || componentAlias || 'div';

    if (comp === 'Text') {
      const textProp = (props as Record<string, unknown>)['text'];
      if (textProp && typeof textProp === 'object' && (textProp as { type?: string }).type === 'JSExpression') {
        const textValue = (textProp as { value?: string }).value ?? '';
        return `{{ ${this.replaceThis(textValue)} }}`;
      }
      return `{{ ${(props as Record<string, unknown>)['text'] || ''} }}`;
    }

    const tag = this.resolveComponentTag(comp);
    description.componentSet.add(comp);

    const attrsArr: IAngularTemplateAttr[] = [];

    const extraDirective = this.resolveExtraDirective(comp);
    if (extraDirective) {
      attrsArr.push({ left: extraDirective });
    }

    if (condition) {
      const conditionValue =
        (condition as { type?: string; value?: string }).type
          ? this.replaceThis((condition as { value?: string }).value ?? '') || condition
          : condition;
      attrsArr.push({ left: '*ngIf', right: `"${conditionValue}"` });
    }

    result.push(`<${tag} `);
    this.handleBinding(props, attrsArr, description, state, comp, schemaMethods);
    result.push(this.renderAttrs(attrsArr));

    if (this.voidElements.includes(tag)) {
      result.push(' />');
    } else {
      result.push('>');
      if (Array.isArray(children)) {
        result.push(
          children.map((child) => this.generateSlotTemplate(child, description, state, schemaMethods)).join(''),
        );
      } else if ((children as { type?: string })?.type === 'JSExpression') {
        result.push(`{{ ${this.replaceThis((children as { value?: string }).value ?? '')} }}`);
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
    methods: Methods,
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
          ? `() => { ${this.replaceThis(getterInfo.body)} }`
          : `() => (${this.replaceThis(getterValue)})()`,
        setterExpr: setterInfo
          ? `(${setterInfo.params.join(',')}) => { ${this.replaceThis(setterInfo.body)} }`
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
    const slotRef = `slot${description.slotTemplates.length}`; // slotTemplates 只增不改,length 即当前计数
    const slotBody = (value as any[]).map((item) => this.generateSlotTemplate(item, description, rootState, methods)).join(''); // value可能不是数组呢？
    description.slotTemplates.push({ ref: slotRef, params, body: slotBody });
    // 用 QUOTES 标记包裹 this.slotN:JSON.stringify 后由 unwrapExpression 还原为对 TemplateRef 字段的引用
    current[prop] = `${start}this.${slotRef}${end}`;
  }

  protected traverseState(
    state: Record<string, any> | any[] | null,
    description: ICodegenDescription,
    rootState: Record<string, any>,
    methods: Methods,
  ): void {
    if (typeof state !== 'object' || state === null) {
      return;
    }
    if (Array.isArray(state)) {
      state.forEach((item) => this.traverseState(item, description, rootState, methods));
      return;
    }
    Object.keys(state).forEach((prop) => {
      if (Object.prototype.hasOwnProperty.call(state, prop)) {
        this.transformStateType(state, prop, description, rootState, methods);
        this.traverseState(state[prop], description, rootState, methods);
      }
    });
  }

  /** Text 文本节点生成:有 style 时包一层 <span>,无 style 时保持纯插值 */
  protected generateTextNode(props: Record<string, unknown>): string {
    const interpolation = this.buildTextInterpolation(props['text']);
    const style = props['style'];
    if (style === undefined || style === null || style === '') {
      return interpolation;
    }
    const styleAttr =
      typeof style === 'object' && (style as { type?: string }).type === 'JSExpression'
        ? `[style]="${this.replaceThis((style as { value?: string }).value ?? '')}"`
        : `style="${String(style).replace(/"/g, '&quot;')}"`;
    return `<span ${styleAttr}>${interpolation}</span>`;
  }

  /** 文本插值 {{ }}:text 为字面量时转义单引号并兜底空串,JSExpression 时直接输出表达式 */
  protected buildTextInterpolation(text: unknown): string {
    if (text && typeof text === 'object' && (text as { type?: string }).type === 'JSExpression') {
      return `{{ ${this.replaceThis((text as { value?: string }).value ?? '')} }}`;
    }
    const escaped = String(text ?? '').replace(/'/g, "\\'");
    return `{{ '${escaped}' || '' }}`;
  }

  protected generateTemplate(
    schema: CardSchema,
    state: Record<string, any>,
    description: ICodegenDescription,
    isRootNode: boolean,
    schemaMethods: Methods,
  ): string {
    const result: string[] = [];
    const { componentName, loop, loopArgs = ['item'], condition, props = {}, children, slot } = schema; // 子组件没有css属性，所以不解构

    if (this.isEmptySlotNode(componentName, children)) {
      return '';
    }

    // 不是组件，而是文本节点，需单独处理
    if (componentName === 'Text' && !isRootNode) {
      return this.generateTextNode(props as Record<string, unknown>);
    }

    let component: string;
    if (isRootNode) {
      component = 'div';
    } else {
      // 组件名 → HTML 标签选择器，如 { TiButton: 'button', TiSelect: 'ti-select' }
      component = this.resolveComponentTag(componentName || 'div'); 
    }

    if (!isRootNode && componentName) {
      // 用于记录要import 哪些组件
      description.componentSet.add(componentName); 
    }

    const attrsArr: IAngularTemplateAttr[] = [];

    // 语义不对
    const extraDirective = componentName ? this.resolveExtraDirective(componentName) : undefined;
    if (extraDirective) {
      attrsArr.push({ left: extraDirective });
    }

    // 处理循环渲染
    let ngForAttr: IAngularTemplateAttr | undefined;
    if (loop) {
      const loopData = (loop as { type?: string; value?: string }).type
        ? this.replaceThis((loop as { value?: string }).value ?? '')
        : JSON.stringify(loop).replace(/"/g, '&quot;'); // loop 为字面量数组时的兜底序列化

      const itemVar = loopArgs[0] || 'item';
      const indexVar = loopArgs[1];
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
          ? this.replaceThis(conditionObj.value ?? '')
          : condition;

      ngIfAttr = { left: '*ngIf', right: `"${conditionValue}"` };
    }

    // 同一元素上两个结构型指令互斥,故 *ngFor + *ngIf 时把 *ngIf 提升到外层 ng-container
    if (ngForAttr && ngIfAttr) {
      result.push(`\n<ng-container ${this.renderAttrs([ngIfAttr])}>`);
    }
    if (ngForAttr) {
      attrsArr.push(ngForAttr);
    } else if (ngIfAttr) {
      attrsArr.push(ngIfAttr);
    }

    result.push(`\n<${component} `);

    // 处理元素属性
    this.handleBinding(props as Record<string, unknown>, attrsArr, description, state, componentName, schemaMethods);
    result.push(this.renderAttrs(attrsArr));

    
    if (this.voidElements.includes(component)) { // 自闭合元素
      result.push(' />');
    } else { // 非自闭合元素
      result.push('>');

      // 库特定的 children 预处理(经 config.transformChildren 注入)
      const transformedChildren = this.processLibrarySpecificChildren(componentName ?? '', children); // 没有
      
      //递归处理子元素 
      this.recurseChildren( // 命名
        transformedChildren ?? children as NodeSchema[] | NodeSchema | string | undefined,
        state,
        description,
        result,
        schemaMethods,
      );
      result.push(this.generateSlotContent(slot, state, description, schemaMethods)); // 没有slot
      result.push(`</${component}>`);
    }

    if (ngForAttr && ngIfAttr) {
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
    schemaMethods: Methods,
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
    schemaMethods: Methods,
  ): string {
    const body = this.generateSlotContent(content, state, description, schemaMethods);
    return `\n<div ${slotName}>${body}</div>`;
  }

  protected buildStateFields(
    schema: CardSchema,
    description: ICodegenDescription,
    methods: Methods,
  ): string {
    const { state = {} } = schema;
    for (const config of this.libraryConfigs) {
      config.transformState?.(state); // 物料专属预处理(各库只碰自己关心的 state 结构,顺序无关)
    }
    this.traverseState(state as Record<string, any>, description, state, methods);
    const stateStr = unwrapExpression(JSON.stringify(state, null, 2));
    if (!stateStr || stateStr === '{}') {
      return '';
    }
    return `state = ${stateStr};`;
  }

  protected buildMethods(schema: CardSchema, description: ICodegenDescription): string {
    const { methods = {} } = schema;
    const methodLines = Object.entries(methods).map(([key, item]) => {
      const info = this.getFunctionInfo(item.value);

      // 由 prop 提升来的函数:当值交给子组件,须箭头化以绑定 this
      if (description.hoistedMethodNames.has(key)) {
        return info ? `${key} = ${this.buildJSFunctionExpression(item.value)};` : `${key} = ${item.value};`;
      }

      if (!info) {
        return `${key} = ${item.value};`;
      }
      const asyncPrefix = info.type ? `${info.type} ` : '';
      const methodName = asyncPrefix && key.startsWith(asyncPrefix.trim())
        ? key.slice(asyncPrefix.length)
        : key;
      const body = info.body;
      // 返回类型省略，由 TS 从函数体推断（methods 可能被模板/事件消费返回值）
      return `${asyncPrefix}${methodName}(${info.params.join(', ')}) { ${body} }`;
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
    const codegenMeta = this.createCodegenMeta();
    // methods 表先补齐:模板生成期会把函数型 prop 提升进来,再由 buildMethods 统一产出类方法
    schema.methods ??= {};
    const schemaMethods = schema.methods;

    const needsCallAction = /\bthis\.callAction\b/.test(JSON.stringify(schema));

    // 1) 模板:主模板 + 收集到的 JSSlot → ng-template 片段(Angular 编译器可正常编译其内容)
    const template = this.generateTemplate(
      schema,
      schema.state as Record<string, any>,
      codegenMeta,
      true,
      schemaMethods
    );
    const finalTemplate = `${template}${this.buildSlotTemplates(codegenMeta)}`; // 在children里处理

    // 2)
    const viewChildDecls = this.buildViewChildDecls(codegenMeta);
    const slotFieldDecls = this.buildSlotFieldDecls(codegenMeta);
    const stateFields = this.buildStateFields(schema, codegenMeta, schemaMethods);
    const lifecycle = this.buildLifecycleMethods(codegenMeta, schema);
    const methods = this.buildMethods(schema, codegenMeta);
    const callActionMethod = this.buildCallActionMethod(needsCallAction);

    // 3) imports 依赖类体成员是否为空(ngOnInit/ngOnDestroy 决定 OnInit/OnDestroy,slotTemplates 决定 ViewChild/TemplateRef)
    const hasInit = !!lifecycle.init;
    const hasDestroy = !!lifecycle.destroy;
    const hasSlot = codegenMeta.slotTemplates.length > 0;
    const { importStatements, moduleNames } = this.buildImports(codegenMeta, {
      init: hasInit,
      destroy: hasDestroy,
      slot: hasSlot,
    });

    // 4) 按段落定义顺序拼装类体
    const sections: IAngularClassSectionDefinition[] = [
      { id: 'viewChildDecls', build: () => viewChildDecls },
      { id: 'state', build: () => stateFields },
      { id: 'slotFieldDecls', build: () => slotFieldDecls },
      { id: 'templateEventMethods', build: () => this.buildTemplateEventMethods(codegenMeta) },
      { id: 'ngOnInit', build: () => lifecycle.init },
      { id: 'ngOnDestroy', build: () => lifecycle.destroy },
      { id: 'methods', build: () => methods },
      { id: 'callAction', build: () => callActionMethod },
    ];
    const classBody = this.assembleSections(sections);

    const selectorName = hyphenate(name || 'SchemaCard');
    const className = capitalize(name || 'SchemaCard');
    const ngImports = ['CommonModule', 'FormsModule', ...moduleNames].join(', ');
    const implementedHooks = [hasInit && 'OnInit', hasDestroy && 'OnDestroy'].filter(Boolean).join(', ');
    const implementsClause = implementedHooks ? ` implements ${implementedHooks}` : '';

    const stylesContent = (schema.css ?? '').replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

    return [
      importStatements,
      '',
      '@Component({',
      `  selector: 'app-${selectorName}',`,
      '  standalone: true,',
      `  imports: [${ngImports}],`,
      `  template: \`${finalTemplate}\`,`,
      `  styles: [\`${stylesContent}\`],`,
      '})',
      `export class ${className}Component${implementsClause} {`,
      classBody ? `  ${classBody}` : '',
      '}',
    ].join('\n');
  }

  /** 收集到的 JSSlot → ng-template 片段,追加到组件模板末尾(Angular 编译器可正常编译其内容) */
  protected buildSlotTemplates(codegenMeta: ICodegenDescription): string {
    return codegenMeta.slotTemplates
      .map(({ ref, params, body }) => `\n<ng-template #${ref} ${params.map((p) => `let-${p}`).join(' ')}>\n${body}\n</ng-template>`)
      .join('');
  }

  /** ng-template 引用声明(ViewChild),供组件类在运行时取得模板里的 #slotN 引用 */
  protected buildViewChildDecls(codegenMeta: ICodegenDescription): string {
    return codegenMeta.slotTemplates
      .map(({ ref }) => `@ViewChild('${ref}', { static: true }) ${ref}!: TemplateRef<any>;`) // static不要写
      .join('\n\n  ');
  }

  /** 含 JSSlot 属性的组件类字段声明(类字段初始化器执行时 ViewChild 未解析,由 ngOnInit 组装) */
  protected buildSlotFieldDecls(codegenMeta: ICodegenDescription): string {
    return codegenMeta.slotFields
      .map(({ fieldName }) => `${fieldName}: any = [];`)
      .join('\n  ');
  }

  /** 事件绑定自动生成的类方法(__handleN),来自 handleEventBinding 收集到元数据的方法串 */
  protected buildTemplateEventMethods(codegenMeta: ICodegenDescription): string {
    return codegenMeta.templateGeneratedMethods.join('\n');
  }

  /** 生命周期函数体:取 lifeCycles[hook] 的函数体。落在类主体内,this 原样保留 */
  protected buildLifecycleBody(schema: CardSchema, hook: 'onMounted' | 'onUnmounted'): string {
    const lifeCycles = schema.lifeCycles;
    const hookFn = lifeCycles?.[hook];
    const fnInfo = hookFn ? this.getFunctionInfo(hookFn.value ?? '') : null;
    return fnInfo ? fnInfo.body : '';
  }

  /**
   * 生命周期方法,两个钩子一并产出:
   * - onMounted → ngOnInit,并在此组装 JSSlot 类字段(把占位引用 this.slotN 替换成 ng-template 的 TemplateRef);
   * - onUnmounted → ngOnDestroy,只装生命周期体,不掺槽位组装。
   * 空串表示该钩子不存在;调用方据此决定 import 哪些接口与 implements 子句。
   */
  protected buildLifecycleMethods(
    codegenMeta: ICodegenDescription,
    schema: CardSchema,
  ): { init: string; destroy: string } {
    const slotFieldInits = codegenMeta.slotFields
      .map(({ fieldName, item }) => `this.${fieldName} = ${unwrapExpression(JSON.stringify(item))};`)
      .join('\n    ');
    const initBody = [this.buildLifecycleBody(schema, 'onMounted'), slotFieldInits].filter(Boolean).join('\n    ');
    const destroyBody = this.buildLifecycleBody(schema, 'onUnmounted');

    return {
      init: initBody ? `ngOnInit(): void {\n    ${initBody}\n  }` : '',
      destroy: destroyBody ? `ngOnDestroy(): void {\n    ${destroyBody}\n  }` : '',
    };
  }

  /** callAction 保留为 this.callAction(...) 调用，运行时通过 customActions 注入实现 */
  protected buildCallActionMethod(needsCallAction: boolean): string {
    return needsCallAction
      ? 'callAction(name: string, params?: unknown): void {\n' +
        '    console.warn(`[GenUI] callAction("${name}") is available at runtime via customActions; implement it for exported code.`, params);\n' +
        '  }'
      : '';
  }

  /** 按段落定义顺序拼接非空类体成员,每段间隔一个空行与两级缩进 */
  protected assembleSections(sections: IAngularClassSectionDefinition[]): string {
    return sections
      .map((section) => section.build())
      .filter(Boolean)
      .join('\n\n  ');
  }

  /**
   * 函数字符串 → 箭头函数表达式(用作类字段初始化器的右值)。
   * 必须是箭头:这类函数是当「值」交给子组件的,真正调用方不是本组件,
   * 只有箭头才能把函数体里的 this 锁在组件实例上。
   */
  protected buildJSFunctionExpression(value: string): string {
    const info = this.getFunctionInfo(value);
    if (!info) {
      return this.replaceThis(value);
    }
    const asyncPrefix = info.type ? `${info.type} ` : '';
    const body = info.body;
    // 形参显式标 any:产物要落在别人 strict 的 Angular 工程里,不标会撞 noImplicitAny
    const paramsWithTypes = info.params.map((p) => `${p}?: any`).join(', ');
    return `${asyncPrefix}(${paramsWithTypes}) => { ${body} }`;
  }

  /** 把值提升为组件 state 字段,返回模板中引用它的表达式 */
  protected hoistPropToState(key: string, item: unknown, state: Record<string, unknown>): string {
    const valueKey = this.avoidDuplicateString(Object.keys(state), key);
    state[valueKey] = item; // 后面 buildStateFields 会再遍历一遍 state 处理{type: , value: }中的type
    return `state.${valueKey}`;
  }

  protected hoistPropToMethod(
    key: string,
    item: JSFunction,
    methods: Methods,
    description: ICodegenDescription,
  ): string {
    const methodName = this.avoidDuplicateString(Object.keys(methods), key);
    methods[methodName] = item;
    description.hoistedMethodNames.add(methodName);
    return methodName;
  }

  /** 把值提升为组件类字段(ng-template 引用场景),返回模板中引用它的字段名 */
  protected hoistPropToTemplateField(key: string, item: unknown, description: ICodegenDescription): string {
    const fieldName = this.avoidDuplicateString(description.slotFields.map((f) => f.fieldName), key);
    description.slotFields.push({ fieldName, item: item as Record<string, unknown> });
    return fieldName;
  }

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

    // 组件库识别:校验 schema 用到的组件是否都属于当前物料
    const usedComponents = this.collectSchemaComponentNames(schema);
    const knownComponents = this.getLibraryComponentNames();
    const unknownComponents = [...usedComponents].filter(
      (c) => !HTML_TAGS.has(c) && !['Text', 'Page', 'SchemaCard'].includes(c) && !knownComponents.has(c),
    );
    if (unknownComponents.length) {
      compileErrors.push({
        message: `组件库识别:以下组件不属于任何已启用组件库,请检查 schema:${unknownComponents.join(', ')}`,
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
