import type { CardSchema, JSFunction, Methods, NodeSchema } from '@opentiny/genui-sdk-core';
import { HTML_TAGS, JS_EXPRESSION, JS_FUNCTION, JS_SLOT, UNWRAP_QUOTES } from './constants';
import type {
  ICodeGeneratorParams,
  ICodegenDescription,
  ICodePanel,
  IAngularLibraryConfig,
  IAngularAttributeSelector,
  IAngularCodeGeneratorOptions,
  AngularBindingKind,
  IAngularTemplateAttr,
  IAngularClassSectionDefinition,
  IAngularCoreImportNeeds,
  ICodeGeneratorResult,
  IViewChildRef,
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

/** schema 中代表 <ng-template> 的 componentName。小写 template 是原生 HTML 标签,不在此列 */
const NG_TEMPLATE_SCHEMA_NAME = 'NgTemplate';

/**
 * 不属于任何组件、由框架指令提供的 output 名。
 *
 * 出码器**无条件** import FormsModule 并列入 imports(见 buildImports),所以 `[(ngModel)]` 的
 * `ngModelChange` 在任何模板里都能绑;但它挂在 NgModel 指令上,不在任何组件的 ɵcmp.outputs 里,
 * 照 componentOutputs 查表必然查不到,只能在这里兜住。这类名字是 Angular 表单的、不是哪个组件库的,
 * 故不放进物料包配置(否则每个物料包都得重复声明一遍)。
 */
const BUILTIN_OUTPUTS = new Set(['ngModelChange']);

/** 事件键的 `on` 前缀形式:`onCurrentPageChange` → `CurrentPageChange`(只剥前缀,不动大小写) */
const ON_PREFIXED_KEY_RE = /^on([A-Z]\w*)$/;

/**
 * Angular 出码器——把 schema 出成 Angular 单文件组件。
 *
 * 组件库差异全部经构造选项 `libraries` 注入,实例化前先从对应物料包的 `code-generator`
 * 子出口 import 配置:
 *
 * ```ts
 * import { TINYNG_CONFIG } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/code-generator';
 *
 * const result = await new AngularCodeGenerator({ libraries: [TINYNG_CONFIG] })
 *   .generate({ pageInfo: { schema } });
 * ```
 *
 * 刻意**不提供 static create / static generateCode**:配置是实例的、必传的,一个"不带参数就能
 * 拿到实例"的静态入口必然要内置某个库做缺省,那就把出码器重新绑死在某个物料包上了。
 * 换库只换调用方那一行 import。
 */
export class AngularCodeGenerator extends CodeGeneratorBase {

  /** 本实例激活的组件库(数组顺序即路由优先级);多库混合出码时按组件名路由(resolveConfig) */
  protected readonly libraryConfigs: readonly IAngularLibraryConfig[];
  private readonly prettierOpts: Record<string, unknown>;

  /**
   * @param options.libraries 组件库配置,**必传**。从对应物料包的 `code-generator` 子出口
   *   import 后传入即可出该物料的码,如:
   *   `new AngularCodeGenerator({ libraries: [TINYNG_CONFIG] })`。
   *   出码器本身不带任何组件库配置,也不 import 任何物料包——换库只换调用方那一行 import。
   */
  constructor(options: IAngularCodeGeneratorOptions) {
    super();

    if (!options?.libraries?.length) {
      throw new Error(
        'AngularCodeGenerator 需要至少一个组件库配置:请先从对应物料包的 code-generator 子出口 import 配置,' +
          '再经 options.libraries 传入,如 new AngularCodeGenerator({ libraries: [TINYNG_CONFIG] })。',
      );
    }

    this.libraryConfigs = [...options.libraries];
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
        config.elementSelector[componentName] ||
        config.attributeSelector?.[componentName] ||
        config.moduleRefMap[componentName]
      ) {
        return config;
      }
    }
    return this.libraryConfigs[0];
  }

  protected get voidElements(): string[] {
    const extra = new Set<string>();
    for (const config of this.libraryConfigs) {
      for (const tag of config.extraVoidElements ?? []) extra.add(tag);
    }
    return ['img', 'input', 'br', 'hr', 'link', ...extra];
  }

  protected resolveComponentTag(componentName: string): string {
    return this.resolveConfig(componentName).elementSelector[componentName] || hyphenate(componentName);
  }

  /**
   * 组件名 → 宿主元素上要挂的属性选择器(选择器是属性型的组件靠它命中,如 TiButton 渲染成 <button tiButton>)。
   * `value` 为 undefined 的是裸属性,只出属性名不出值。
   */
  protected resolveAttributeSelectors(componentName: string): IAngularAttributeSelector[] {
    return this.resolveConfig(componentName).attributeSelector?.[componentName] ?? [];
  }


  protected isNgTemplateComponent(componentName: string | undefined): boolean {
    return componentName === NG_TEMPLATE_SCHEMA_NAME;
  }

  /**
   * 空模板节点守卫:ng-template 既无 children 又无 props.let 时整节点丢弃。
   * Angular 允许 `<ng-template></ng-template>`,但它不出现在渲染结果里,产出只会是噪音。
   */
  protected isEmptyTemplateNode(
    componentName: string | undefined,
    props: Record<string, unknown>,
    children: unknown,
  ): boolean {
    if (!this.isNgTemplateComponent(componentName)) {
      return false;
    }
    const hasChildren = Array.isArray(children) ? children.length > 0 : !!children;
    return !hasChildren;
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

  /**
   * 库专属节点级特殊处理:按所属库的 config.extensions 顺序调用(见 libraries/library-extension.ts)。
   * 这是出码器唯一的组件库扩展点,本类不认识任何具体库、也没有任何库的特判分支。
   *
   * 路由照旧走 resolveConfig —— 组件名在所有映射表里都没命中时会兜底第一个库,所以扩展实现必须
   * 自查 node.componentName,不能默认「轮到我 = 就是我的组件」。
   *
   * 返回值守卫:钩子签名是 `(node) => void`,而 TS 允许把有返回值的函数赋给 void 返回位置,于是
   * `return node.children.map(...)` 这种写法**能编译通过却静默什么都不做**。ICodeGeneratorResult 没有
   * errors 通道,漏包一层 TiItem 只能等 Angular 运行期在目标组件上崩出来,很难倒查到出码这一步。
   * 故与 parseFunctionOrThrow 同款:当场抛错,让不生效的扩展在出码当场暴露。
   */
  protected applyNodeExtensions(node: NodeSchema): void {
    const extensions = this.resolveConfig(node.componentName ?? '').extensions ?? [];
    for (const extension of extensions) {
      // as unknown:钩子声明返回 void,断言掉后才能把「实际返回值」拿出来判断
      const returned = extension.transformNode?.(node) as unknown;
      if (returned !== undefined) {
        throw new Error(
          `[AngularCodeGenerator] 组件库扩展 "${extension.name}" 的 transformNode 返回了值,` +
            `该钩子必须就地改写 node、不得返回值(返回值的写法不会生效),组件:${node.componentName ?? ''}`,
        );
      }
    }
  }

  protected buildImports(
    description: ICodegenDescription,
    needs: IAngularCoreImportNeeds = {},
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

    // @ViewChild 的字段类型是物料组件类名时,该符号必须与 NgModule 落在同一条 import 里,
    // 否则产物报 `Cannot find name 'TiTableComponent'`。
    // 只并入 modulesByPackage(import 行);moduleNames 会进 @Component({imports:[…]}),
    // 组件类名进去会编译报错,绝不能碰。
    description.viewChildRefs.forEach((item) => {
      if (!item.fieldTypePackage) {
        return;
      }
      let list = modulesByPackage.get(item.fieldTypePackage);
      if (!list) {
        list = [];
        modulesByPackage.set(item.fieldTypePackage, list);
      }
      if (!list.includes(item.fieldType)) {
        list.push(item.fieldType);
      }
    });

    const lines: string[] = [];

    const coreImports = ['Component'];
    if (needs.outputs) {
      coreImports.push('Output', 'EventEmitter');
    }
    if (needs.init) {
      coreImports.push('OnInit');
    }
    if (needs.afterViewInit) {
      coreImports.push('AfterViewInit');
    }
    if (needs.destroy) {
      coreImports.push('OnDestroy');
    }
    if (needs.viewChild) {
      coreImports.push('ViewChild');
    }
    if (needs.viewChildren) {
      coreImports.push('ViewChildren', 'QueryList');
    }
    // 字段类型用到的符号由已生成的声明串反查,避免「类型来源」与「导入清单」两处手工维护而漂移
    if (needs.elementRef) {
      coreImports.push('ElementRef');
    }
    if (needs.templateRef) {
      coreImports.push('TemplateRef');
    }
    lines.push(`import { ${coreImports.join(', ')} } from '@angular/core';`);
    lines.push("import { CommonModule } from '@angular/common';");
    lines.push("import { FormsModule } from '@angular/forms';");

    for (const [pkg, mods] of modulesByPackage) {
      lines.push(`import { ${mods.join(', ')} } from '${pkg}';`);
    }

    return { importStatements: lines.join('\n'), moduleNames };
  }

  protected toTemplateValue(item: unknown): string {
    return this.replaceThis((item as { value?: string } | null | undefined)?.value ?? '');
  }

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

    if (propType === JS_SLOT) {
      return null;
    }

    // 函数提升进根节点的 methods
    if (propType === JS_FUNCTION) {
      return `"${this.hoistPropToMethod(key, rawValue as JSFunction, schemaMethods, description)}"`;
    }

    if (propType === JS_EXPRESSION) {
      return `"${this.toTemplateValue(rawValue)}"`;
    }

    // 剩余为字面量值，对象字面量需先探查是否内含 JSFunction / JSSlot
    if (rawValue && typeof rawValue === 'object') {
      const localInternalTypes = this.withLocalInternalTypes(description, (localTypes) => {
        this.traverseState(rawValue as Record<string, unknown>, description, state, schemaMethods ?? {});
        return localTypes;
      });

      if (localInternalTypes.has(JS_SLOT)) {
        // 对象里嵌了 JSSlot:整条属性不产出(内层 traverseState 已把 JSSlot 键静默丢弃)
        return null;
      }
      if (localInternalTypes.has('JSFunction')) {
        return `"${this.hoistPropToState(key, rawValue, state)}"`;
      }

      const parsedValue = unwrapExpression(JSON.stringify(rawValue)).replace(/props\./g, '');
      return `'${parsedValue.replace(/'/g, '&#39;')}'`;
    }

    return `"${rawValue}"`;
  }

  protected handleEventBinding(
    item: { type?: string; value?: string; params?: string[] },
    description: ICodegenDescription,
    schemaMethods: Methods,
  ): string | null {
    if (item?.type === JS_FUNCTION) {
      const fnInfo = this.parseFunctionOrThrow(item.value ?? '');  // 是否异步、参数、函数体

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
   * 判定 prop 键是不是「真实事件输出」,命中则返回**模板里该写的真实输出名**(camelCase),否则 null。
   *
   * 判据是**查表**而不是看键名形状:表来自各库物料包的 componentOutputs(由组件 ɵcmp.outputs 推导)
   * 加上 BUILTIN_OUTPUTS。两个候选依次查——
   *   1. 键名本身:`currentPageChange` 就是 TiPagination 的真实 @Output 名,直接命中;
   *   2. 键名剥掉 `on` 前缀:`onCurrentPageChange` 在 schema 里更常见(渲染器按 `on` + 输出名
   *      去 bindProps 里取,见 component-outlet 的 toOnEventName,物料示例与 AI 产出都按这个约定写),
   *      剥出来的名字同样命中。
   *
   * 两条只差一个前缀,查的是同一张表、同一个结论——**带不带 on 都是事件**,不是两种机制。
   * 未命中(null)只说明"这个名字不是该组件的输出",由调用方按属性绑定处理;若它形如 onXxx,
   * 还会落到下面原生 DOM 事件那条老路(onClick → (click))。这也是必须查表的原因:
   * 光看键名形状无法区分 `onCurrentPageChange`(组件输出)与 `onClick`(原生 DOM 事件)。
   */
  protected resolveOutputName(
    key: string,
    componentName: string,
    cfg: IAngularLibraryConfig,
  ): string | null {
    const stripped = ON_PREFIXED_KEY_RE.exec(key)?.[1];
    const candidates = [
      key,
      stripped ? stripped.charAt(0).toLowerCase() + stripped.slice(1) : null,
    ];
    const outputs = cfg.componentOutputs?.[componentName];

    for (const candidate of candidates) {
      if (!candidate) continue;
      if (outputs?.includes(candidate) || BUILTIN_OUTPUTS.has(candidate)) return candidate;
    }
    return null;
  }

  protected resolveBindingKind(
    key: string,
    propType: string,
    rawValue: unknown,
    outputName?: string | null,
  ): AngularBindingKind {
    // 键名命中真实 @Output 即为事件绑定(带不带 on 前缀都算,理由见 resolveOutputName)
    if (outputName) return 'event';
    // 未命中却是 onXxx 形状的,按原生 DOM 事件处理:onClick → (click)
    if (this.isOnEventKey(key)) return 'event';
    if (propType === 'literal') return typeof rawValue === 'string' ? 'static' : 'property';
    if (propType === JS_EXPRESSION) {
      return (rawValue as { model?: unknown } | null)?.model ? 'twoWay' : 'property';
    }
    return 'property';
  }

  protected renderBindingLeft(kind: AngularBindingKind, key: string, outputName?: string | null): string {
    switch (kind) {
      case 'static':
        return key;
      case 'property':
        return `[${key}]`;
      case 'twoWay':
        return `[(${key})]`;
      case 'event':
        // 命中真实输出:原样用输出名,不做连字符化。@Output 名是 camelCase,而
        // (current-page-change) 编译得过却永远不触发——圆括号里的陌生名字被当成 DOM 事件监听,
        // 不经任何归一化去匹配组件的输出,于是错误是静默的(实测见 types.ts 的 componentOutputs 注释)
        return `(${outputName ?? toEventKey(key)})`;
    }
  }

  protected renderAttrs(attrs: IAngularTemplateAttr[]): string {
    return attrs
      .map((attr) => (attr.right === undefined ? attr.left : `${attr.left}=${attr.right}`))
      .join(' ');
  }

  protected handleLetBinding(
    rawValue: unknown,
    componentName: string,
    attrsArr: IAngularTemplateAttr[],
  ): void {
    if (!this.isNgTemplateComponent(componentName)) {
      return;
    }
    if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
      return;
    }
    // "let": { "labelFromScope": "label", "myContext": "$implicit", "index": "index" }
    Object.entries(rawValue as Record<string, unknown>).forEach(([localName, contextKey]) => {
      attrsArr.push({ left: `let-${localName}`, right: `"${contextKey}"` });
    });
  }

  protected handleRefBinding(
    key: 'ref' | 'refName',
    rawValue: unknown,
    componentName: string,
    attrsArr: IAngularTemplateAttr[],
    description: ICodegenDescription,
    inLoop: boolean,
    indexVar: string | undefined,
  ): void {
    const parsed = this.parseRefName(key, rawValue);
    if (!parsed) {
      return;
    }
    const { name, subscript } = parsed;

    if (key === 'ref') {
      if (subscript && (!inLoop || subscript !== indexVar)) {
        return;
      }
      if (!subscript && inLoop) {
        return;
      }
    }

    if (attrsArr.some((attr) => attr.left === `#${name}`)) {
      return;
    }
    if (key === 'ref') {
      if (description.viewChildRefs.some((item) => item.queryName === name)) {
        return;
      }
      const { type, fromPackage, unwrapNative } = this.resolveRefFieldType(componentName);
      description.viewChildRefs.push({
        queryName: name,
        fieldName: name,
        fieldType: type,
        fieldTypePackage: fromPackage,
        assignTo: `refs.${name}`,
        kind: subscript ? 'viewChildren' : 'viewChild',
        unwrapNative,
      });
    }

    // 无右值 无值属性形态
    attrsArr.push({ left: `#${name}` });
  }

  protected parseRefName(
    key: 'ref' | 'refName',
    rawValue: unknown,
  ): { name: string; subscript?: string } | null {
    if (key === 'refName') {
      return typeof rawValue === 'string' ? { name: rawValue } : null;
    }

    let value: unknown = rawValue;
    if (value && typeof value === 'object') {
      const expr = value as { type?: string; value?: unknown };
      if (expr.type !== JS_EXPRESSION) {
        return null;
      }
      value = expr.value;
    }
    if (typeof value !== 'string') {
      return null;
    }

    // 1) 剥掉 this.refs 前缀
    const trimmed = value.trim();
    let rest: string | null = null;
    if (trimmed.startsWith('this.refs.')) {
      rest = trimmed.slice('this.refs.'.length);
    } else if (trimmed.startsWith('refs.')) {
      rest = trimmed.slice('refs.'.length);
    }
    if (rest === null) {
      return null;
    }

    // 2) 剩下的要么是裸标识符,要么是 `标识符[索引]`
    const bare = /^([A-Za-z_$][\w$]*)$/.exec(rest);
    if (bare) {
      return { name: bare[1] };
    }
    const indexed = /^([A-Za-z_$][\w$]*)\[([A-Za-z_$][\w$]*)\]$/.exec(rest);
    // refs[index] → { name: 'refs', subscript: 'index' }
    return indexed ? { name: indexed[1], subscript: indexed[2] } : null;
  }

  protected resolveRefFieldType(
    componentName: string | undefined,
  ): { type: string; fromPackage?: string; unwrapNative?: boolean } {
    if (this.isNgTemplateComponent(componentName)) {
      return { type: 'TemplateRef<any>' };
    }
    if (!componentName || HTML_TAGS.has(componentName) || this.voidElements.includes(componentName)) {
      // 查询结果是 ElementRef,而 refs 要放 DOM 元素,取值时需再取一层
      return { type: 'ElementRef', unwrapNative: true };
    }
    for (const config of this.libraryConfigs) { // 获取需要导入的组件类
      const className = config.componentExportMap?.[componentName];
      if (className) {
        return { type: className, fromPackage: config.libraryPackage };
      }
    }
    return { type: 'any' };
  }

  protected handleBinding(
    props: Record<string, unknown>,
    attrsArr: IAngularTemplateAttr[],
    description: ICodegenDescription,
    state: Record<string, unknown>,
    componentName: string,
    schemaMethods: Methods,
    options: { inLoop?: boolean; indexVar?: string } = {},
  ): void {
    Object.entries(props).forEach(([rawKey, rawValue]) => {
      let key = rawKey === 'className' ? 'class' : rawKey;

      // ref / refName / let 是 schema 接线属性,不是组件 @Input,故先于库配置的黑名单与重命名处理
      if (key === 'let') {
        this.handleLetBinding(rawValue, componentName ?? '', attrsArr);
        return;
      }
      if (key === 'ref' || key === 'refName') {
        this.handleRefBinding(
          key,
          rawValue,
          componentName ?? '',
          attrsArr,
          description,
          options.inLoop ?? false,
          options.indexVar,
        );
        return;
      }

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

      // === Common Angular logic below ===
      // 左值决定括号,右值统一由 resolveBindingRight 产出(内部覆盖字面量/表达式/函数/插槽)
      const propType = this.resolvePropValueType(rawValue); // 'JSExpression' 'JSFunction' 'JSSlot'
      // 键名是否命中该组件的真实 @Output(命中即事件绑定,与带不带 on 前缀无关)
      const outputName = this.resolveOutputName(key, componentName ?? '', cfg);
      const kind = this.resolveBindingKind(key, propType, rawValue, outputName);
      const right = this.resolveBindingRight(kind, key, rawValue, propType, description, state, schemaMethods);
      if (right === null) {
        return;
      }
      attrsArr.push({ left: this.renderBindingLeft(kind, key, outputName), right });
    });
  }

  protected recurseChildren(
    children: NodeSchema['children'],
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
    // JSSlot 落到这里即静默丢弃:不产出,也不改写 current[prop](避免 delete 在数组下标上留洞)。
    // 调用方据此把整条属性丢掉——静默产出 `columns='{"type":"JSSlot",…}'` 比不产出更糟。
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
        ? `[style]="${this.toTemplateValue(style)}"`
        : `style="${String(style).replace(/"/g, '&quot;')}"`;
    return `<span ${styleAttr}>${interpolation}</span>`;
  }

  /** 文本插值 {{ }}:text 为字面量时转义单引号并兜底空串,JSExpression 时直接输出表达式 */
  protected buildTextInterpolation(text: unknown): string {
    if (text && typeof text === 'object' && (text as { type?: string }).type === 'JSExpression') {
      return `{{ ${this.toTemplateValue(text)} }}`;
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
    const { componentName, loop, loopArgs = ['item'], condition, props = {}, children } = schema; // 子组件没有css属性，所以不解构

    // 判断是不是NgTemplate
    const isTemplate = this.isNgTemplateComponent(componentName);

    if (this.isEmptyTemplateNode(componentName, props as Record<string, unknown>, children)) {
      return '';
    }

    // 不是组件，而是文本节点，需单独处理
    if (componentName === 'Text' && !isRootNode) {
      return this.generateTextNode(props as Record<string, unknown>);
    }

    let component: string;
    if (isRootNode) {
      component = 'div';
    } else if (isTemplate) { // 因为使用ng-template不用记录import，所以不走下面的else分支
      component = 'ng-template';
    } else {
      // 组件名 → 宿主元素标签选择器，如 { TiButton: 'button', TiSelect: 'ti-select' }
      component = this.resolveComponentTag(componentName || 'div');
    }

    if (!isRootNode && componentName && !isTemplate) {
      // 用于记录要import 哪些组件(ng-template 无模块可 import,加进去会产出不存在的 NgTemplateModule)
      description.componentSet.add(componentName);
    }

    const attrsArr: IAngularTemplateAttr[] = [];

    const extraAttrs = componentName && !isTemplate ? this.resolveAttributeSelectors(componentName) : [];
    for (const { name, value } of extraAttrs) {
      // 带值的属性选择器(如 [type=text])必须连值一起输出,否则匹配不到该组件
      attrsArr.push(value === undefined ? { left: name } : { left: name, right: `"${value}"` });
    }

    // 处理循环渲染
    let ngForAttr: IAngularTemplateAttr | undefined;
    if (loop) {
      const loopData = (loop as { type?: string; value?: string }).type
        ? this.toTemplateValue(loop)
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
          ? this.toTemplateValue(conditionObj)
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
    this.handleBinding(props as Record<string, unknown>, attrsArr, description, state, componentName, schemaMethods, {
      inLoop: !!loop,
      indexVar: loop ? loopArgs[1] : undefined,
    });

    result.push(this.renderAttrs(attrsArr));

    if (this.voidElements.includes(component)) { // 自闭合元素
      result.push(' />');
    } else { // 非自闭合元素
      result.push('>');

      // 库专属的节点级特殊处理(经 config.extensions 注入):就地改写 schema,典型是换掉 schema.children
      this.applyNodeExtensions(schema);

      // 递归处理子元素。必须重读 schema.children:扩展改的是节点对象上的槽位,不是上面解构出的局部变量
      this.recurseChildren(schema.children, state, description, result, schemaMethods);
      // 节点的 slot 字段不产出:Angular 没有插槽概念,改由 NgTemplate + props.let 表达作用域模板
      result.push(`</${component}>`);
    }

    if (ngForAttr && ngIfAttr) {
      result.push('\n</ng-container>');
    }

    return result.join('');
  }

  protected buildStateFields(
    schema: CardSchema,
    description: ICodegenDescription,
    methods: Methods,
  ): string {
    const { state = {} } = schema;
    this.traverseState(state as Record<string, any>, description, state, methods);
    const stateStr = unwrapExpression(JSON.stringify(state, null, 2));
    if (!stateStr || stateStr === '{}') {
      return '';
    }
    return `state = ${stateStr};`;
  }

  /**
   * 为每个 @ViewChild 字段定名:默认沿用 queryName,与现有类成员重名时经 avoidDuplicateString 改名。
   * 只改类字段名;`#name` 查询键与 `refs.<name>` 契约保持不变。
   */
  protected resolveViewChildFieldNames(schema: CardSchema, codegenMeta: ICodegenDescription): void {
    const existing: string[] = ['refs'];
    if (/\bthis\.callAction\b/.test(JSON.stringify(schema))) {
      existing.push('callAction');
    }
    Object.keys((schema.state ?? {}) as Record<string, unknown>).forEach((key) => existing.push(key));
    Object.keys((schema.methods ?? {}) as Record<string, unknown>).forEach((key) => existing.push(key));
    // 模板里自动生成的 __handleN 方法:从方法串首行签名里抠名字,避免与 ref 字段撞名
    codegenMeta.templateGeneratedMethods.forEach((method) => {
      const match = /^\s*(?:async\s+)?([A-Za-z_$][\w$]*)\s*\(/.exec(method);
      if (match) {
        existing.push(match[1]);
      }
    });

    // item.fieldName是 @ViewChild 字段名
    codegenMeta.viewChildRefs.forEach((item) => {
      item.fieldName = this.avoidDuplicateString(existing, item.queryName);
      existing.push(item.fieldName);
    });
  }

  protected buildViewChildDecls(codegenMeta: ICodegenDescription): string {
    return codegenMeta.viewChildRefs
      .map((item) => (
        item.kind === 'viewChildren'
          ? `@ViewChildren('${item.queryName}') ${item.fieldName}!: QueryList<${item.fieldType}>;`
          : `@ViewChild('${item.queryName}') ${item.fieldName}!: ${item.fieldType};`
      ))
      .join('\n\n  ');
  }
  
  protected buildRefsField(schema: CardSchema, codegenMeta: ICodegenDescription): string {
    const declared = (schema.refs ?? {}) as Record<string, unknown>;
    if (!Object.keys(declared).length && !codegenMeta.viewChildRefs.length) {
      return '';
    }
    const merged: Record<string, unknown> = { ...declared };
    codegenMeta.viewChildRefs.forEach((item) => {
      // props.ref有但this.refs没有的情况，就在this.refs里添加 aref: null 的键值对，后面再给this.refs.aref赋值
      if (!(item.queryName in merged)) {
        merged[item.queryName] = null;
      }
    });
    return `refs: any = ${JSON.stringify(merged, null, 2)};`;
  }

  protected buildMethods(schema: CardSchema, description: ICodegenDescription): string {
    const { methods = {} } = schema;
    const methodLines = Object.entries(methods).map(([key, item]) => {
      // 由 prop 提升来的函数:当值交给子组件,须箭头化以绑定 this
      if (description.hoistedMethodNames.has(key)) {
        return `${key} = ${this.buildJSFunctionExpression(item.value)};`;
      }

      const info = this.parseFunctionOrThrow(item.value);
      const asyncPrefix = info.type ? `${info.type} ` : '';
      const methodName = asyncPrefix && key.startsWith(asyncPrefix.trim())
        ? key.slice(asyncPrefix.length)
        : key;
      const body = info.body;
      const paramsWithTypes = info.params.map((p) => `${p}?: any`).join(', ');

      return `${asyncPrefix}${methodName}(${paramsWithTypes}) { ${body} }`;
    });
    return methodLines.join('\n\n  ');
  }

  protected buildAngularComponentSource({ schema, name }: { schema: CardSchema; name?: string }): string {
    const codegenMeta = this.createCodegenMeta();
    // methods 表先补齐:模板生成期会把函数型 prop 提升进来,再由 buildMethods 统一产出类方法
    schema.methods ??= {};
    const schemaMethods = schema.methods;

    const needsCallAction = /\bthis\.callAction\b/.test(JSON.stringify(schema));

    // 1) 模板:整棵 schema 一次生成(ng-template 作为普通节点在 children 里处理)
    const template = this.generateTemplate(
      schema,
      schema.state as Record<string, any>,
      codegenMeta,
      true,
      schemaMethods
    );

    // 2) 类体各段落。字段定名必须先于任何取名字的地方(模板里 refs.<name> 用的仍是 queryName)
    this.resolveViewChildFieldNames(schema, codegenMeta);
    const viewChildDecls = this.buildViewChildDecls(codegenMeta);
    const refsField = this.buildRefsField(schema, codegenMeta);
    const stateFields = this.buildStateFields(schema, codegenMeta, schemaMethods);
    const lifecycle = this.buildLifecycleMethods(codegenMeta, schema);
    const methods = this.buildMethods(schema, codegenMeta);
    const callActionMethod = this.buildCallActionMethod(needsCallAction);

    // 3) imports 依赖类体里实际出现了什么(ngOnInit/ngOnDestroy 决定 OnInit/OnDestroy)
    const hasInit = !!lifecycle.init;
    const hasDestroy = !!lifecycle.destroy;
    const hasAfterViewInit = !!lifecycle.afterViewInit;
    // 类型符号从已生成的声明串反查,避免「类型来源」与「导入清单」两处手工维护而漂移
    const declarations = `${viewChildDecls}\n${refsField}\n${stateFields}`;
    const { importStatements, moduleNames } = this.buildImports(codegenMeta, {
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
      { id: 'templateEventMethods', build: () => this.buildTemplateEventMethods(codegenMeta) },
      { id: 'ngOnInit', build: () => lifecycle.init },
      { id: 'ngAfterViewInit', build: () => lifecycle.afterViewInit },
      { id: 'ngOnDestroy', build: () => lifecycle.destroy },
      { id: 'methods', build: () => methods },
      { id: 'callAction', build: () => callActionMethod },
    ];
    const classBody = this.assembleSections(sections);

    const selectorName = hyphenate(name || 'SchemaCard');
    const className = capitalize(name || 'SchemaCard');
    const ngImports = ['CommonModule', 'FormsModule', ...moduleNames].join(', ');
    const implementedHooks = [hasInit && 'OnInit', hasAfterViewInit && 'AfterViewInit', hasDestroy && 'OnDestroy']
      .filter(Boolean)
      .join(', ');
    const implementsClause = implementedHooks ? ` implements ${implementedHooks}` : '';

    const stylesContent = (schema.css ?? '').replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

    return [
      importStatements,
      '',
      '@Component({',
      `  selector: 'app-${selectorName}',`,
      '  standalone: true,',
      `  imports: [${ngImports}],`,
      `  template: \`${template}\`,`,
      `  styles: [\`${stylesContent}\`],`,
      '})',
      `export class ${className}Component${implementsClause} {`,
      classBody ? `  ${classBody}` : '',
      '}',
    ].join('\n');
  }

  /** 事件绑定自动生成的类方法(__handleN),来自 handleEventBinding 收集到元数据的方法串 */
  protected buildTemplateEventMethods(codegenMeta: ICodegenDescription): string {
    return codegenMeta.templateGeneratedMethods.join('\n');
  }

  /** 生命周期函数体:取 lifeCycles[hook] 的函数体。落在类主体内,this 原样保留 */
  protected buildLifecycleBody(schema: CardSchema, hook: 'onMounted' | 'onUnmounted'): string {
    const lifeCycles = schema.lifeCycles;
    const hookFn = lifeCycles?.[hook];
    return hookFn ? this.parseFunctionOrThrow(hookFn.value ?? '').body : '';
  }

  /**
   * 单条 ref 的接线语句(不含 this. 前缀的推导由 assignTo/fieldName 自带)。
   * - 单例:查询结果直接就是 refs 要的值,取不取 nativeElement 由 unwrapNative 决定;
   * - 集合:一次查询收回整组有序实例(顺序即 *ngFor 的迭代顺序),整组写进 refs,
   *   等价于渲染器侧 `refs.x[index] = instance` 的逐格写入;视图后增时(如 *ngIf 切换)
   *   再靠 changes 通知重算一次,避免 refs 停留在首帧的快照上。
   */
  protected buildRefAssignment(item: IViewChildRef): string {
    // 原生元素要.nativeElement
    const value = `this.${item.fieldName}${item.unwrapNative ? '.nativeElement' : ''}`;
    if (item.kind !== 'viewChildren') {
      return `this.${item.assignTo} = ${value};`;
    }
    const listValue = item.unwrapNative ? 'e.nativeElement' : 'e';
    // 局部函数名按字段名派生(fieldName 已是合法标识符且互相去重),多个集合 ref 同处一个钩子也不会撞名
    const sync = `sync${item.fieldName.charAt(0).toUpperCase()}${item.fieldName.slice(1)}`;
    return [
      `const ${sync} = () => {`,
      `  this.${item.assignTo} = this.${item.fieldName}.toArray().map((e) => ${listValue});`,
      `};`,
      `${sync}();`,
      `this.${item.fieldName}.changes.subscribe(${sync});`,
    ].join('\n    ');
  }

  protected buildLifecycleMethods(
    codegenMeta: ICodegenDescription,
    schema: CardSchema,
  ): { init: string; destroy: string; afterViewInit: string } {
    const initBody = this.buildLifecycleBody(schema, 'onMounted');
    const destroyBody = this.buildLifecycleBody(schema, 'onUnmounted');
    const refAssignments = codegenMeta.viewChildRefs
      .map((item) => this.buildRefAssignment(item))
      .join('\n    ');

    return {
      init: initBody ? `ngOnInit(): void {\n    ${initBody}\n  }` : '',
      destroy: destroyBody ? `ngOnDestroy(): void {\n    ${destroyBody}\n  }` : '',
      afterViewInit: refAssignments ? `ngAfterViewInit(): void {\n    ${refAssignments}\n  }` : '',
    };
  }

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
   * 解析函数字符串，失败即抛。支持两种形态：
   *   1. `function 名字(...) { ... }` —— 交基类 getFunctionInfo（与 Vue 出码器共用，故不动它）；
   *   2. 箭头函数 —— `(a, b) => { ... }` / `(a) => 表达式`，可带 `async` 前缀。
   *
   * 箭头是必须支持的形态：about-this.ts 给模型的 JSFunction 示例就是
   * `(event) => this.hello(event, name)`，且该文件写明「事件绑定更推荐使用 JSFunction 模式」。
   * 实测基类正则对上述**每一种**箭头形态都返回 null，所以"基类未命中即按箭头解析"不会误判。
   *
   * 此前每个调用点各写一套失败兜底——返回 ''、原样落成语义不同的类字段、原样包成表达式——行为互相
   * 矛盾，且都对使用者不可见。最糟的一处产出 `(click)=""`：编译通过、点了没反应，让人去怀疑生成器
   * 而不是 schema 写法。改为统一在此抛出，让无法解析的输入在出码当场暴露，并带上原始字符串便于定位。
   */
  protected parseFunctionOrThrow(fnStr: string): { type: string; params: string[]; body: string } {
    const info = this.getFunctionInfo(fnStr);
    const parsed = info ?? this.parseArrowFunction(fnStr);
    if (parsed) {
      // 形参只留名字：`function(file: File)` 的类型标注会被下游拼成 `file: File?: any` 这种非法签名，
      // 并且和自由变量的裸名对不上（`declaredParams.includes('file')` 为假），导致形参重复一遍
      return { ...parsed, params: parsed.params.map((p) => p.split(/[:=]/)[0].trim()).filter(Boolean) };
    }
    throw new Error(
      `[AngularCodeGenerator] 无法解析函数，仅支持 \`function 名字(...) { ... }\` 与箭头函数 \`(a) => ...\`：${fnStr}`,
    );
  }

  /**
   * 把箭头函数解析成与 getFunctionInfo 同形的 { type, params, body }。
   *
   * body 一律归一成**语句**：表达式体必须补 `return`——下游四处都把它内联进 `{ ... }`
   * （buildMethods / handleEventBinding / buildLifecycleBody / buildJSFunctionExpression），
   * 原样塞进去会退化成一条没有返回值的表达式语句，静默丢掉返回值。
   *
   * 形参只接受简单标识符：handleEventBinding 会把形参名直接当模板实参拼进 `(click)="..."`，
   * 类型标注/解构/默认值在这里静默变形比直接抛错更难查。形态不符返回 null，由调用方统一报错。
   */
  protected parseArrowFunction(fnStr: string): { type: string; params: string[]; body: string } | null {
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

  // 只有箭头才能把函数体里的 this 锁在组件实例上。
  protected buildJSFunctionExpression(value: string): string {
    const info = this.parseFunctionOrThrow(value);
    const asyncPrefix = info.type ? `${info.type} ` : '';
    const body = info.body;
    // 形参显式标 any
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

    const panel: ICodePanel = {
      panelName,
      panelValue: angularCode,
      panelType: 'angular',
      prettierOpts: { ...this.prettierOpts },
      type: 'page',
    };
    if (formatWithPrettier) {
      panel.panelValue = await this.formatWithPrettier(panel.panelValue, panel.prettierOpts);
    }
    return panel;
  }
}
