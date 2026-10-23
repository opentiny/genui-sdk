/**
 * 绑定层：把节点 props 翻成模板上的绑定（[x] / (x) / 静态属性 / let-*），并处理值里嵌套的协议对象
 * （值遍历 traverseValue 与 state 类型改写 transformStateType 同属这条链，故放在一起）。
 */
import type { JSFunction, Methods } from '@opentiny/genui-sdk-core';
import { EMPTY_LOOP_SCOPE, JS_EXPRESSION, JS_FUNCTION, JS_SLOT, UNWRAP_QUOTES, stateGetterToken } from './constants';
import type { IBaseHelpers } from './base-helpers';
import { AngularMaterialsRegistry } from './angular-materials-registry';
import { AngularRefResolver } from './angular-ref-resolver';
import { AngularSourceText } from './angular-source-text';
import type {
  AngularBindingKind,
  IAngularMaterialsConfig,
  IAngularTemplateAttr,
  ICodegenDescription,
  ILoopScope,
} from './types';
import {
  CONTEXT_NAME_RE,
  EVENT_NAME_RE,
  MEMBER_NAME_RE,
  PROPERTY_NAME_RE,
  STATIC_ATTR_RE,
  toEventKey,
  toMemberName,
  unwrapExpression,
} from './utils';

// onNgModelChange不能直接去掉on 转成小写会报错
const BUILTIN_OUTPUTS = new Set(['ngModelChange']);

// 事件键的 `on` 前缀形式
const ON_PREFIXED_KEY_RE = /^on([A-Z]\w*)$/;

export class AngularBindingRenderer {
  constructor(
    private readonly registry: AngularMaterialsRegistry,
    private readonly refs: AngularRefResolver,
    private readonly sourceText: AngularSourceText,
    private readonly base: IBaseHelpers,
  ) {}
  toTemplateValue(
    item: unknown,
    description?: ICodegenDescription,
    loopScope: ILoopScope = EMPTY_LOOP_SCOPE,
  ): string {
    const expr = (item as { value?: string } | null | undefined)?.value ?? '';
    // Angular 模板表达式是 JS 的子集:赋值/箭头等写法模板解析不了,先提升成类方法
    if (description && !this.isTemplateSafe(this.base.replaceThis(expr))) {
      return this.hoistTemplateExpression(expr, description, loopScope);
    }
    return this.escapeTemplateExpression(expr);
  }

  /** 落进模板的表达式:this. 要剥掉;属性值用双引号包,表达式里的双引号要转义 */
  private escapeTemplateExpression(expr: string): string {
    return this.base.replaceThis(expr).replace(/"/g, '&quot;');
  }

  /** 提升成类方法,模板里改成调用;循环变量等模板作用域的值接成形参 */
  private hoistTemplateExpression(
    expr: string,
    description: ICodegenDescription,
    loopScope: ILoopScope,
  ): string {
    const name = `__expr${++description.templateExprCounter}`;
    const code = this.expressionCode(expr);
    const vars = [...new Set([...loopScope.templateVars, ...description.templateLocals])].filter((v) =>
      new RegExp(`(?<!\\.)\\b${v}\\b`).test(code),
    );
    description.templateExpressions.push({ name, body: expr, vars });
    return `${name}(${vars.join(', ')})`;
  }

  /** 表达式里真正的代码:去掉字符串、注释与模板串的字面量文本,只留 ${…} 里的内容 */
  private expressionCode(expr: string): string {
    return expr
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")
      .replace(/"(?:[^"\\]|\\.)*"/g, '""')
      .replace(/\/\/[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(
        /`(?:[^`\\]|\\.)*`/g,
        (literal) => [...literal.matchAll(/\$\{([^}]*)\}/g)].map((m) => ` ${m[1]} `).join('') || "''",
      );
  }

  /** Angular 模板表达式不支持的 JS 语法:赋值、箭头、自增、位运算与语句关键字 */
  private isTemplateSafe(expr: string): boolean {
    const code = this.expressionCode(expr);
    if (/[;\\]/.test(code)) {
      return false;
    }
    if (/=>|\+\+|--|\.\.\./.test(code)) {
      return false;
    }
    if (/\b(this|new|typeof|void|delete|in|instanceof|function|class|await|yield)\b/.test(code)) {
      return false;
    }
    // 复合赋值
    if (/(\*\*|<<|>>>?|&&|\|\||\?\?|[+\-*/%&|^])=/.test(code)) {
      return false;
    }
    // 简单赋值,排除 == === != <= >=
    if (/(^|[^=!<>])=(?!=)/.test(code)) {
      return false;
    }
    // 模板里的 | 是管道;& ^ ~ 不合法
    if (/[&|^~]/.test(code.replace(/&&|\|\||\?\?/g, ''))) {
      return false;
    }
    return true;
  }

  resolveBindingRight(
    kind: AngularBindingKind,
    key: string,
    rawValue: unknown,
    propType: string,
    description: ICodegenDescription,
    schemaMethods: Methods,
    loopScope: ILoopScope,
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
        loopScope,
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
      // 双向绑定的左侧必须可赋值,提升成方法会丢掉赋值目标,只能原样落模板
      const expr =
        kind === 'twoWay'
          ? this.toTemplateValue(rawValue)
          : this.toTemplateValue(rawValue, description, loopScope);
      return `"${expr}"`;
    }

    // 剩余为字面量值，对象字面量需先探查是否内含 JSFunction
    if (rawValue && typeof rawValue === 'object') {
      // 模板里写不出箭头函数:对象/数组里的函数先提升成类方法,就地换成方法名,对象本身照常留在绑定里
      this.hoistNestedFunctions(rawValue as Record<string, any>, description, schemaMethods, key);
      // 这一趟遍历顺带就地改写内层 JSExpression,返回值报告命中的类型
      const internalTypes = this.traverseValue(rawValue as Record<string, unknown>, description);

      if (internalTypes.has(JS_SLOT)) {
        return null;
      }

      // 表达式里的 this. 在这一步剥掉:落进模板的值没有 this(同一批值若被搬进 state 则要留着,见 transformStateType)
      const parsedValue = unwrapExpression(this.stripThisInExpressionTokens(JSON.stringify(rawValue))).replace(
        /props\./g,
        '',
      );
      // 对象里嵌了模板语法表达不了的表达式:整个对象提升成方法调用。
      // 方法体里 this 是组件实例,要用保留 this. 的原文,不能拿剥过的
      if (!this.isTemplateSafe(parsedValue)) {
        const rawText = unwrapExpression(JSON.stringify(rawValue)).replace(/props\./g, '');
        return `"${this.hoistTemplateExpression(rawText, description, loopScope)}"`;
      }
      return `'${parsedValue.replace(/'/g, '&#39;')}'`;
    }

    return `"${rawValue}"`;
  }

  handleEventBinding(
    item: { type?: string; value?: string; params?: string[] },
    description: ICodegenDescription,
    schemaMethods: Methods,
    loopScope: ILoopScope,
  ): string | null {
    if (item?.type === JS_FUNCTION) {
      const fnInfo = this.sourceText.parseFunctionOrThrow(item.value ?? '');  // 解析是否异步、参数、函数体这3项信息

      // JSFunction类型的value值是匿名函数，需要加名字。计数器走元数据，保证每次出码从 0 开始
      description.templateMethodCounter++;
      const methodName = `__handle${description.templateMethodCounter}`;

      const body = fnInfo.body;

      const declaredParams = fnInfo.params; // 函数自己声明的形参
      const passedParams = item.params ?? []; // 协议里的 params 是实参

      // 形参 = 声明形参 + 给多出来的实参补位
      const arity = Math.max(declaredParams.length, passedParams.length ? passedParams.length + 1 : 0);
      const signatureParams = Array.from({ length: arity }, (_, i) => declaredParams[i] ?? `__arg${i}`);

      const scopeVars = [...new Set([...loopScope.templateVars, ...description.templateLocals])].filter(
        (v) => !declaredParams.includes(v) && new RegExp(`(?<!\\.)\\b${v}\\b`).test(body),
      );

      const asyncPrefix = fnInfo.type ? `${fnInfo.type} ` : '';
      const scopeParam = scopeVars.length
        ? `__scope: { ${scopeVars.map((v) => `${v}?: any`).join('; ')} } = {}`
        : '';
      const paramsWithTypes = [...signatureParams.map((v) => `${v}?: any`), scopeParam].filter(Boolean).join(', ');

      const methodSignature = paramsWithTypes
        ? `${asyncPrefix}${methodName}(${paramsWithTypes})`
        : `${asyncPrefix}${methodName}()`;
      const scopePrelude = scopeVars.length ? `const { ${scopeVars.join(', ')} } = __scope; ` : '';
      description.templateGeneratedMethods.push(`${methodSignature} { ${scopePrelude}${body} }`);

      const callArgs = [
        ...(passedParams.length
          ? ['$event', ...passedParams.map((p) => this.escapeTemplateExpression(p))]
          : signatureParams.map((v, i) => (i === 0 && declaredParams.length > 0 ? '$event' : v))),
        scopeVars.length ? `{ ${scopeVars.map((v) => `${v}: ${v}`).join(', ')} }` : '',
      ].filter(Boolean).join(', ');
      return `${methodName}(${callArgs})`;
    }

    if (item?.type !== JS_EXPRESSION) {
      return null;
    }

    const eventHandler = this.toTemplateValue(item);
    // 模板里补成 value($event, ...params)
    if (item.params?.length) {
      // 实参比方法声明多时,签名要补位
      this.raiseMethodArity(eventHandler, item.params.length + 1, schemaMethods, description);
      const args = ['$event', ...item.params.map((p) => this.escapeTemplateExpression(p))].join(', ');
      return `${eventHandler}(${args})`;
    }
    if (/^\w+$/.test(eventHandler)) { // 不带括号， 判断函数定义有无参数， 有则传入事件对象
      if (schemaMethods && schemaMethods[eventHandler]) {
        const methodInfo = this.base.getFunctionInfo(schemaMethods[eventHandler].value);
        if (methodInfo && methodInfo.params.length > 0) {
          return `${eventHandler}($event)`;
        }
      }
      return `${eventHandler}()`;
    }
    // eventHandler是带括号的调用
    return eventHandler;
  }

  /** 模板调用的实参个数超过 schema 方法声明的形参个数时,记下签名下限,由 buildMethods 补位 */
  private raiseMethodArity(
    name: string,
    arity: number,
    schemaMethods: Methods,
    description: ICodegenDescription,
  ): void {
    const method = schemaMethods?.[name];
    if (!method) {
      return;
    }
    const info = this.base.getFunctionInfo(method.value);
    if (info && info.params.length < arity) {
      description.methodArityFloor[name] = arity;
    }
  }

  resolveOutputName(
    key: string,
    componentName: string,
    cfg: IAngularMaterialsConfig,
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

  resolveBindingKind(
    key: string,
    propType: string,
    rawValue: unknown,
    outputName?: string | null,
  ): AngularBindingKind {
    // 键名命中真实 @Output 即为事件绑定(带不带 on 前缀都算)
    if (outputName) return 'event';
    // 未命中却是 onXxx 形状的,按原生 DOM 事件处理:onClick → (click)
    if (this.base.isOnEventKey(key)) return 'event';
    if (propType === 'literal') return typeof rawValue === 'string' ? 'static' : 'property';
    if (propType === JS_EXPRESSION) {
      return (rawValue as { model?: unknown } | null)?.model ? 'twoWay' : 'property';
    }
    return 'property';
  }

  /** 键名/事件名会原样进模板,只放行保守的白名单形态 */
  private isSafeBindingName(kind: AngularBindingKind, key: string, outputName?: string | null): boolean {
    if (kind === 'static') {
      return STATIC_ATTR_RE.test(key);
    }
    if (kind === 'event') {
      return EVENT_NAME_RE.test(outputName ?? toEventKey(key));
    }
    return PROPERTY_NAME_RE.test(key);
  }

  renderBindingLeft(kind: AngularBindingKind, key: string, outputName?: string | null): string {
    switch (kind) {
      case 'static':
        return key;
      case 'property':
        return `[${key}]`;
      case 'twoWay':
        return `[(${key})]`;
      case 'event':
        return `(${outputName ?? toEventKey(key)})`;
    }
  }

  renderAttrs(attrs: IAngularTemplateAttr[]): string {
    return attrs
      .map((attr) => (attr.right === undefined ? attr.left : `${attr.left}=${attr.right}`))
      .join(' ');
  }

  handleLetBinding(
    rawValue: unknown,
    componentName: string,
    attrsArr: IAngularTemplateAttr[],
  ): void {
    if (!this.registry.isNgTemplateComponent(componentName)) {
      return;
    }
    if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
      return;
    }
    // "let": { "labelFromScope": "label", "myContext": "$implicit", "index": "index" }
    Object.entries(rawValue as Record<string, unknown>).forEach(([localName, contextKey]) => {
      // 变量名与上下文键原样进模板:不合法就丢弃
      if (!MEMBER_NAME_RE.test(localName) || typeof contextKey !== 'string' || !CONTEXT_NAME_RE.test(contextKey)) {
        return;
      }
      attrsArr.push({ left: `let-${localName}`, right: `"${contextKey}"` });
    });
  }

  handleBinding(
    props: Record<string, unknown>,
    attrsArr: IAngularTemplateAttr[],
    description: ICodegenDescription,
    componentName: string,
    schemaMethods: Methods,
    loopScope: ILoopScope = EMPTY_LOOP_SCOPE,
  ): void {
    Object.entries(props).forEach(([rawKey, rawValue]) => {
      let key = rawKey === 'className' ? 'class' : rawKey;

      // ref / refName / let 是 schema 接线属性,不是组件 @Input
      if (key === 'let') {
        this.handleLetBinding(rawValue, componentName ?? '', attrsArr);
        return;
      }
      if (key === 'ref' || key === 'refName') {
        this.refs.handleRefBinding(key, rawValue, componentName ?? '', attrsArr, description, loopScope);
        return;
      }

      // 组件名 -> 组件所属的 物料配置
      const cfg = this.registry.resolveConfig(componentName ?? '');

      // 有时候ai会输出一些组件不存在的属性，把它们列在黑名单里
      if (cfg.propBlacklist?.[componentName ?? '']?.includes(key)) {
        return;
      }

      // ai输出的属性名和组件合法属性名不同 就rename
      const rename = cfg.propRename?.[componentName ?? '']?.[key];
      if (rename) {
        key = rename;
      }

      // 左值决定括号,右值统一由 resolveBindingRight 产出(内部覆盖字面量/表达式/函数)
      const propType = this.base.resolvePropValueType(rawValue); // 'JSExpression' 'JSFunction'
      // 键名不带on的是否命中该组件的真实 @Output(命中即事件绑定)
      const outputName = this.resolveOutputName(key, componentName ?? '', cfg);
      const kind = this.resolveBindingKind(key, propType, rawValue, outputName);
      // 键名会原样拼进模板属性表:不合法就整条丢弃
      if (!this.isSafeBindingName(kind, key, outputName)) {
        return;
      }
      const right = this.resolveBindingRight(kind, key, rawValue, propType, description, schemaMethods, loopScope);
      if (right === null) {
        return;
      }
      attrsArr.push({ left: this.renderBindingLeft(kind, key, outputName), right });
    });
  }

  // 就地改写 current[prop]:JSExpression / JSFunction 转成 #QUOTES_START#…#QUOTES_END# 串。
  // 这里不剥 this. ——落点是类字段初始化器、类 getter,还是 state 字面量,this 都是组件实例;
  // 剥掉只会得到 TS2663(state = { x: state.y })。模板侧没有 this,剥的动作归「落进模板」那一步。
  //
  // stateDepth 标明这一趟在哪:null = 不在 state 字面量里(props 的值),否则是相对 state 根的第几层。
  transformStateType(
    current: Record<string, any>,
    prop: string,
    description: ICodegenDescription,
    stateDepth: number | null,
  ): string | null {


    const builtInTypes = [JS_EXPRESSION, JS_FUNCTION, JS_SLOT];
    const { type } = current[prop] || {};
    if (!builtInTypes.includes(type)) {
      return null;
    }

    const { start, end } = UNWRAP_QUOTES;

    if (type === JS_EXPRESSION) { // js表达式 加#QUOTES_START# 和 #QUOTES_END# 把js表达式结构对象转化为函数字符串
      const { value = '', computed = false } = current[prop] || {};
      // 落进 state 字面量的值在类字段初始化器里求值,那时 state 还没建好:标了 computed 的、或自己引用
      // this.state 的表达式求不出值,改成 state 字面量里的 get 访问器。props 的值落进模板,照旧就地内联。
      const selfReferencing = /this\.state\b/.test(this.base.stripLiterals(value));
      if (stateDepth !== null && (computed || selfReferencing)) {
        current[prop] = this.pushStateGetter(description, prop, value, stateDepth);
        return JS_EXPRESSION;
      }
      current[prop] = `${start}${value}${end}`;
      return JS_EXPRESSION;
    }

    if (type === JS_FUNCTION) { // 箭头函数化， 把函数结构对象转化为函数字符串
      const { value = '' } = current[prop] || {};
      const info = this.base.getFunctionInfo(value);
      if (!info) {
        current[prop] = `${start}${typeof value === 'string' ? value : ''}${end}`;
        return JS_FUNCTION;
      }
      const inlineFunc = `${info.type} (${info.params.join(',')}) => { ${info.body} }`;
      current[prop] = `${start}${inlineFunc}${end}`;
      return JS_FUNCTION;
    }

    // JSSlot 落到这里即静默丢弃
    return JS_SLOT;
  }

  private pushStateGetter(
    description: ICodegenDescription,
    name: string,
    value: string,
    stateDepth: number,
  ): string {
    if (stateDepth !== 0) {
      throw new Error(
        `[AngularCodeGenerator] state 里只有顶层的值能标 computed 或引用 this.state 自身:${name} 嵌在 state 的嵌套结构里,` +
          '没法落成 state 字面量里的 getter,请把它提到 state 顶层。',
      );
    }
    if (!/^[A-Za-z_$][\w$]*$/.test(name)) {
      throw new Error(`[AngularCodeGenerator] state 里的派生值 ${name} 不是合法标识符,没法落成 getter。`);
    }
    if (/this\.(?!state\b)/.test(this.base.stripLiterals(value))) {
      throw new Error(
        `[AngularCodeGenerator] state 里的派生值 ${name} 除 this.state 外还引用了别的 this.*:` +
          '它落成 state 字面量里的 getter,那里的 this 是 state 自身,拿不到 refs/methods。',
      );
    }
    description.stateAccessors.push({
      name,
      getterBody: `return ${value.replace(/\bthis\.state\b/g, 'this')};`,
    });
    return stateGetterToken(description.stateAccessors.length - 1);
  }

  /**
   * 遍历某个值(prop 的右值,或根 state)——逐键就地改写,
   * 并把命中的协议类型收进 internalTypes。返回值是 internalTypes。
   */
  traverseValue(
    value: Record<string, any> | any[] | null,
    description: ICodegenDescription,
    internalTypes: Set<string> = new Set<string>(),
    stateDepth: number | null = null,
  ): Set<string> {
    if (typeof value !== 'object' || value === null) {
      return internalTypes;
    }
    // 往下走一层就深一层;不在 state 里(null)的一直保持 null
    const childDepth = stateDepth === null ? null : stateDepth + 1;
    if (Array.isArray(value)) {
      value.forEach((item) => this.traverseValue(item, description, internalTypes, childDepth));
      return internalTypes;
    }
    Object.keys(value).forEach((prop) => {
      if (Object.prototype.hasOwnProperty.call(value, prop)) {
        const matchedType = this.transformStateType(value, prop, description, stateDepth);
        if (matchedType !== null) {
          internalTypes.add(matchedType);
        }
        this.traverseValue(value[prop], description, internalTypes, childDepth);
      }
    });
    return internalTypes;
  }

  /**
   * 对象/数组里的 JSFunction 提升成类方法,就地换成方法名——模板里写不出箭头函数,
   * 而方法引用(箭头类字段)在模板里是合法表达式。JSSlot 整段跳过:那个值最终会被丢掉,提升出来的只是死代码。
   * baseName 是数组元素取名的兜底(元素没有键名,只有下标,不能拿「0」当方法名)。
   */
  private hoistNestedFunctions(
    value: Record<string, any>,
    description: ICodegenDescription,
    methods: Methods,
    baseName: string,
  ): void {
    if (value.type === JS_SLOT) {
      return;
    }
    Object.entries(value).forEach(([prop, child]) => {
      if (!child || typeof child !== 'object') {
        return;
      }
      if (child.type === JS_FUNCTION) {
        const name = this.hoistPropToMethod(Array.isArray(value) ? baseName : prop, child as JSFunction, methods, description);
        const { start, end } = UNWRAP_QUOTES;
        value[prop] = `${start}${name}${end}`;
        return;
      }
      this.hoistNestedFunctions(child as Record<string, any>, description, methods, baseName);
    });
  }

  /** 表达式 token 里的 this. 剥掉(模板里没有 this);JSON 里字符串数据中的 "this." 不动 */
  private stripThisInExpressionTokens(json: string): string {
    const { start, end } = UNWRAP_QUOTES;
    return json.replace(
      new RegExp(`"${start}(.*?)${end}"`, 'g'),
      (_full, expr: string) => `"${start}${this.base.replaceThis(expr)}${end}"`,
    );
  }

  hoistPropToMethod(
    key: string,
    item: JSFunction,
    methods: Methods,
    description: ICodegenDescription,
  ): string {
    // 提升出来的名字要能当类成员:脏键名先压成合法标识符
    const methodName = this.base.avoidDuplicateString(Object.keys(methods), toMemberName(key));
    methods[methodName] = item;
    description.hoistedMethodNames.add(methodName);
    return methodName;
  }
}
