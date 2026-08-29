import type { CardSchema, NodeSchema } from '@opentiny/genui-sdk-core';
import { HTML_TAGS, JS_EXPRESSION, JS_FUNCTION, JS_SLOT, UNWRAP_QUOTES } from './constants';
import type {
  ICodeGeneratorParams,
  ICodegenDescription,
  ICodePanel,
  IAngularLibraryConfig,
  AngularLibraryRef,
  IAngularCodeGeneratorOptions,
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

export class AngularCodeGeneratorBase extends CodeGeneratorBase {

  /** 组件库注册表:key 为库标识,value 为该库的 IAngularLibraryConfig。分类逻辑收在类内,无需外部工厂。
   *  新增一个组件库的完整步骤(以 Material 为例):
   *    1. materials 目录下建 Material 物料包(components/modules 命名导出);
   *    2. libraries/ 下建 material/ 目录,复用 derive-library-maps 推导映射,写 map.ts;
   *    3. 按 AngularPropAdapter 抽象实现 prop-adapters.ts;
   *    4. 仿 libraries/tinyng/config.ts 定义 Material 的 IAngularLibraryConfig(map + propAdapters + 库专属策略);
   *    5. 在下方注册表加一行。
   */
  static readonly libraries = {
    'opentiny-ng': TINYNG_CONFIG,
  } as const satisfies Record<string, IAngularLibraryConfig>;

  /** 默认组件库标识,未显式指定时使用 */
  static readonly defaultLibrary = 'opentiny-ng';

  /** 激活的组件库列表(注册顺序),缺省仅默认库;多库混合出码时按组件名路由(resolveConfig) */
  protected readonly libraryConfigs: ReadonlyArray<{ name: string; config: IAngularLibraryConfig }>;
  private readonly prettierOpts: Record<string, unknown>;

  constructor(
    library?: AngularLibraryRef,
    private readonly generatorOptions: IAngularCodeGeneratorOptions = {},
  ) {
    super();
    const raw =
      library === undefined ? [AngularCodeGeneratorBase.defaultLibrary] : Array.isArray(library) ? library : [library];
    const seen = new Set<string>();
    const resolved: { name: string; config: IAngularLibraryConfig }[] = [];
    for (const name of raw) {
      if (seen.has(name)) continue; // 去重,保序
      seen.add(name);
      const config = (AngularCodeGeneratorBase.libraries as Record<string, IAngularLibraryConfig | undefined>)[name];
      if (!config) {
        throw new Error(`未知 Angular 组件库:"${name}",可用库:${Object.keys(AngularCodeGeneratorBase.libraries).join(', ')}`);
      }
      resolved.push({ name, config });
    }
    // 空数组回退默认库
    this.libraryConfigs =
      resolved.length > 0
        ? resolved
        : [
            {
              name: AngularCodeGeneratorBase.defaultLibrary,
              config: (AngularCodeGeneratorBase.libraries as Record<string, IAngularLibraryConfig | undefined>)[
                AngularCodeGeneratorBase.defaultLibrary
              ]!,
            },
          ];
    this.prettierOpts = {
      ...DEFAULT_PRETTIER_OPTS,
      ...(generatorOptions.prettierOpts ?? {}),
    };
  }

  /** 组件名 → 激活库配置。单库直接返回;多库按注册顺序查,首个命中该组件的库胜出;未命中兜底第一个库 */
  protected resolveConfig(componentName: string): IAngularLibraryConfig {
    if (this.libraryConfigs.length === 1) return this.libraryConfigs[0].config;
    for (const { config } of this.libraryConfigs) {
      if (
        config.libraryComponents?.has(componentName) ||
        config.componentSelector[componentName] ||
        config.moduleRefMap[componentName]
      ) {
        return config;
      }
    }
    return this.libraryConfigs[0].config;
  }

  /** 创建出码器;未指定库名时默认 opentiny-ng,传数组可同时启用多个组件库(多库混合出码) */
  static create(
    library?: AngularLibraryRef,
    options: IAngularCodeGeneratorOptions = {},
  ): AngularCodeGeneratorBase {
    return new AngularCodeGeneratorBase(library, options);
  }

  /** 默认(opentiny-ng)出码入口,对外保持唯一 API */
  static generateCode(params: ICodeGeneratorParams): Promise<ICodeGeneratorResult> {
    return new AngularCodeGeneratorBase().generate(params);
  }

  protected get voidElements(): string[] {
    const extra = new Set<string>();
    for (const { config } of this.libraryConfigs) {
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

  /** 类方法体清理:this.props.xxx → this.xxx(保留 this,去掉 props 层级) */
  protected cleanThisInClassBody(value: string): string {
    return value.replace(/this\.props\./g, 'this.');
  }

  /** 模板表达式清理:this.xxx / this.props.xxx → xxx(去掉 this 前缀) */
  protected cleanThisInTemplate(value: string): string {
    return value.replace(/this\.(props\.)?/g, '');
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
    for (const { config } of this.libraryConfigs) {
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
    attrsArr: string[],
    description: ICodegenDescription,
    state: Record<string, unknown>,
    schemaMethods?: Record<string, { value: string }>,
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
      cleanThisInTemplate: (value) => this.cleanThisInTemplate(value),
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
    hasOutputs = false,
    hasLifecycle = false,
    hasSlot = false,
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

    for (const [pkg, mods] of modulesByPackage) {
      lines.push(`import { ${mods.join(', ')} } from '${pkg}';`);
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
      // 以临时 internalTypes 集合遍历该字面量,避免类型标志借道写入共享元数据;遍历结束自动恢复外层集合
      const localInternalTypes = this.withLocalInternalTypes(description, (localTypes) => {
        this.traverseState(item as Record<string, unknown>, description, state);
        return localTypes;
      });

      if (localInternalTypes.has('JSFunction') || localInternalTypes.has('JSSlot')) { // 将函数提升到state中， JSSlot是什么
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
    description: ICodegenDescription,
    schemaMethods?: Record<string, { value: string }>,
  ): string {
    const eventKey = toEventKey(key);

    if (item?.type === JS_FUNCTION) {
      const fnInfo = this.getFunctionInfo(item.value ?? '');  // 是否异步、参数、函数体
      if (!fnInfo) {
        return `(${eventKey})=""`;
      }

      // JSFunction类型的value值是匿名函数，需要加名字。计数器走元数据，保证每次出码从 0 开始
      description.templateMethodCounter++;
      const methodName = `__handle${description.templateMethodCounter}`;

      const body = this.cleanThisInClassBody(fnInfo.body);

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
      return `(${eventKey})="${methodName}(${callArgs})"`;
    }

    if (item?.type !== JS_EXPRESSION) {
      return '';
    }

    const eventHandler = this.cleanThisInTemplate(item.value ?? '');
    if (/^\w+$/.test(eventHandler)) { // 不带括号， 判断函数定义有无参数， 有则传入事件对象
      if (schemaMethods && schemaMethods[eventHandler]) {
        const methodInfo = this.getFunctionInfo(schemaMethods[eventHandler].value);
        if (methodInfo && methodInfo.params.length > 0) {
          return `(${eventKey})="${eventHandler}($event)"`;
        }
      }
      return `(${eventKey})="${eventHandler}()"`;
    }
    // eventHandler是带括号的调用
    return `(${eventKey})="${eventHandler}"`;
  }

  protected handleBinding(
    props: Record<string, unknown>,
    attrsArr: string[],
    description: ICodegenDescription,
    state: Record<string, unknown>,
    componentName?: string,
    schemaMethods?: Record<string, { value: string }>,
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

      const item = rawValue as { type?: string; value?: string; model?: { prop?: string }; params?: string[] };
      const propType = this.resolvePropValueType(rawValue); // 'JSExpression' 'JSFunction' 'JSSlot'

      if (this.isOnEventKey(key)) {
        const eventBinding = this.handleEventBinding(key, item, description, schemaMethods);
        if (eventBinding) {
          attrsArr.push(eventBinding);
        }
        return;
      }

      if (propType === 'literal') {
        this.handleLiteralBinding(key, rawValue, attrsArr, description, state);
        return;
      }

      if (propType === JS_FUNCTION) {
        this.hoistPropToState(key, rawValue, attrsArr, state);
        return;
      }

      if (propType === JS_EXPRESSION) {
        if (item.model) {
          attrsArr.push(`[(ngModel)]="${this.cleanThisInTemplate(item.value ?? '')}"`);
          return;
        }
        attrsArr.push(`[${key}]="${this.cleanThisInTemplate(item.value ?? '')}"`);
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
        return `{{ ${this.cleanThisInTemplate(textValue)} }}`;
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
          ? this.cleanThisInTemplate((condition as { value?: string }).value ?? '') || condition
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
        result.push(`{{ ${this.cleanThisInTemplate((children as { value?: string }).value ?? '')} }}`);
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
          ? `() => { ${this.cleanThisInTemplate(getterInfo.body)} }`
          : `() => (${this.replaceThis(getterValue)})()`,
        setterExpr: setterInfo
          ? `(${setterInfo.params.join(',')}) => { ${this.cleanThisInTemplate(setterInfo.body)} }`
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
    const slotBody = (value as any[]).map((item) => this.generateSlotTemplate(item, description, rootState)).join(''); // value可能不是数组呢？
    description.slotTemplates.push({ ref: slotRef, params, body: slotBody });
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

  /** Text 文本节点生成:有 style 时包一层 <span>,无 style 时保持纯插值(如表格单元格文本) */
  protected generateTextNode(props: Record<string, unknown>): string {
    const interpolation = this.buildTextInterpolation(props['text']);
    const style = props['style'];
    if (style === undefined || style === null || style === '') {
      return interpolation;
    }
    const styleAttr =
      typeof style === 'object' && (style as { type?: string }).type === 'JSExpression'
        ? `[style]="${this.cleanThisInTemplate((style as { value?: string }).value ?? '')}"`
        : `style="${String(style).replace(/"/g, '&quot;')}"`;
    return `<span ${styleAttr}>${interpolation}</span>`;
  }

  /** 文本插值 {{ }}:text 为字面量时转义单引号并兜底空串,JSExpression 时直接输出表达式 */
  protected buildTextInterpolation(text: unknown): string {
    if (text && typeof text === 'object' && (text as { type?: string }).type === 'JSExpression') {
      return `{{ ${this.cleanThisInTemplate((text as { value?: string }).value ?? '')} }}`;
    }
    const escaped = String(text ?? '').replace(/'/g, "\\'");
    return `{{ '${escaped}' || '' }}`;
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

    const attrsArr: string[] = [];

    const extraDirective = componentName ? this.resolveExtraDirective(componentName) : undefined;
    if (extraDirective) {
      attrsArr.push(extraDirective);
    }

    // 处理循环渲染
    let ngForAttr = '';
    if (loop) {
      const loopData = (loop as { type?: string; value?: string }).type
        ? this.cleanThisInTemplate((loop as { value?: string }).value ?? '')
        : JSON.stringify(loop).replace(/"/g, '&quot;'); // loop 为字面量数组时的兜底序列化

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
          ? this.cleanThisInTemplate(conditionObj.value ?? '')
          : condition;

      ngIfAttr = `*ngIf="${conditionValue}"`
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

    // 处理元素属性
    this.handleBinding(props as Record<string, unknown>, attrsArr, description, state, componentName, schemaMethods);
    result.push(attrsArr.join(' '));

    
    if (this.voidElements.includes(component)) { // 自闭合元素
      result.push(' />');
    } else { // 非自闭合元素
      result.push('>');

      // 库特定的 children 预处理(经 config.transformChildren 注入)
      const transformedChildren = this.processLibrarySpecificChildren(componentName ?? '', children);
      
      //递归处理子元素 
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
    for (const { config } of this.libraryConfigs) {
      config.transformState?.(state); // 物料专属预处理(如 TiTable srcData.state 缺省字段补全);各库只碰自己关心的 state 结构,顺序无关
    }
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
        return `${key} = ${this.cleanThisInClassBody(item.value)};`;
      }
      const asyncPrefix = info.type ? `${info.type} ` : '';
      const methodName = asyncPrefix && key.startsWith(asyncPrefix.trim())
        ? key.slice(asyncPrefix.length)
        : key;
      const body = this.cleanThisInClassBody(info.body);
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
    const schemaMethods = (schema as CardSchema & { methods?: Record<string, { value: string }> }).methods;
    // 与 Vue 出码一致：整体检测 schema 是否使用 callAction，命中则保留调用并注入占位实现
    const needsCallAction = /\bthis\.callAction\b/.test(JSON.stringify(schema));

    // 1) 模板:主模板 + 收集到的 JSSlot → ng-template 片段(Angular 编译器可正常编译其内容)
    const template = this.generateTemplate(
      schema,
      schema.state as Record<string, any>,
      codegenMeta,
      true,
      schemaMethods
    );
    const finalTemplate = `${template}${this.buildSlotTemplates(codegenMeta)}`;

    // 2) 类体各段落,顺序与原实现一致:先快照 ViewChild/slotField 声明,再遍历 state。
    //    buildStateFields 遍历 schema.state 可能向 slotTemplates 追加 JSSlot,故必须在其后判断 hasSlot。
    const viewChildDecls = this.buildViewChildDecls(codegenMeta);
    const slotFieldDecls = this.buildSlotFieldDecls(codegenMeta);
    const stateFields = this.buildStateFields(schema, codegenMeta);
    const lifecycle = this.buildLifecycleMethod(codegenMeta, this.buildLifecycleBody(schema));
    const methods = this.buildMethods(schema);
    const callActionMethod = this.buildCallActionMethod(needsCallAction);

    // 3) imports 依赖类体成员是否为空(ngOnInit 决定 OnInit,slotTemplates 决定 ViewChild/TemplateRef)
    const hasLifecycle = !!lifecycle;
    const hasSlot = codegenMeta.slotTemplates.length > 0;
    const { importStatements, moduleNames } = this.buildImports(codegenMeta, false, hasLifecycle, hasSlot);

    // 4) 按段落定义顺序拼装类体(与 Vue 出码的段落化方式一致,每段一个构建方法)
    const sections: IAngularClassSectionDefinition[] = [
      { id: 'viewChildDecls', build: () => viewChildDecls },
      { id: 'state', build: () => stateFields },
      { id: 'slotFieldDecls', build: () => slotFieldDecls },
      { id: 'templateEventMethods', build: () => this.buildTemplateEventMethods(codegenMeta) },
      { id: 'lifecycle', build: () => lifecycle },
      { id: 'methods', build: () => methods },
      { id: 'callAction', build: () => callActionMethod },
    ];
    const classBody = this.assembleSections(sections);

    const selectorName = hyphenate(name || 'SchemaCard');
    const className = capitalize(name || 'SchemaCard');
    const ngImports = ['CommonModule', 'FormsModule', ...moduleNames].join(', ');
    const implementsClause = hasLifecycle ? ' implements OnInit' : '';

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

  /** 收集到的 JSSlot → ng-template 片段,追加到组件模板末尾(Angular 编译器可正常编译其内容) */
  protected buildSlotTemplates(codegenMeta: ICodegenDescription): string {
    return codegenMeta.slotTemplates
      .map(({ ref, params, body }) => `\n<ng-template #${ref} ${params.map((p) => `let-${p}`).join(' ')}>\n${body}\n</ng-template>`)
      .join('');
  }

  /** ng-template 引用声明(ViewChild),供组件类在运行时取得模板里的 #slotN 引用 */
  protected buildViewChildDecls(codegenMeta: ICodegenDescription): string {
    return codegenMeta.slotTemplates
      .map(({ ref }) => `@ViewChild('${ref}', { static: true }) ${ref}!: TemplateRef<any>;`)
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

  /** onMounted 生命周期函数体(this.props → this 清理) */
  protected buildLifecycleBody(schema: CardSchema): string {
    const lifeCycles = (schema as CardSchema & { lifeCycles?: Record<string, { type?: string; value?: string }> }).lifeCycles;
    const mountedFn = lifeCycles?.onMounted;
    const fnInfo = mountedFn ? this.getFunctionInfo(mountedFn.value ?? '') : null;
    return fnInfo ? this.cleanThisInClassBody(fnInfo.body) : '';
  }

  /** JSSlot 组装:含作用域插槽的属性提升为类字段,在 ngOnInit 里把占位引用(this.slotN)替换成 ng-template 的 TemplateRef */
  protected buildLifecycleMethod(codegenMeta: ICodegenDescription, lifecycleBody: string): string {
    const slotFieldInits = codegenMeta.slotFields
      .map(({ fieldName, item }) => `this.${fieldName} = ${unwrapExpression(JSON.stringify(item))};`)
      .join('\n    ');
    const initBody = [lifecycleBody, slotFieldInits].filter(Boolean).join('\n    ');
    return initBody ? `ngOnInit(): void {\n    ${initBody}\n  }` : '';
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

  protected buildJSFunctionExpression(value: string): string {
    const info = this.getFunctionInfo(value);
    if (!info) {
      return this.replaceThis(value);
    }
    const asyncPrefix = info.type ? `${info.type} ` : '';
    const body = this.cleanThisInClassBody(info.body);
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
    const fieldName = this.avoidDuplicateString(description.slotFields.map((f) => f.fieldName), key);
    description.slotFields.push({ fieldName, item: item as Record<string, unknown> });
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
