import type { CardSchema, NodeSchema } from '@opentiny/genui-sdk-core';
import { JS_EXPRESSION, JS_FUNCTION, JS_I18N, JS_RESOURCE, JS_SLOT, UNWRAP_QUOTES } from './constants';
import type {
  ICodeGeneratorParams,
  ICodegenDescription,
  ICodePanel,
  IAngularLibraryConfig,
  ICodeGeneratorResult,
} from './types';
import { capitalize, hyphenate, toEventKey, unwrapExpression } from './utils';
import { CodeGeneratorBase } from './code-generator-base';

export class AngularCodeGeneratorBase extends CodeGeneratorBase {

  constructor(protected readonly config: IAngularLibraryConfig) {
    super();
  }

  protected templateActionNames: Set<string> = new Set();
  protected templateGeneratedMethods: string[] = [];
  private templateMethodCounter = 0;

  protected get voidElements(): string[] {
    return ['img', 'input', 'br', 'hr', 'link', ...(this.config.extraVoidElements ?? [])];
  }

  protected resolveComponentTag(componentName: string): string {
    return this.config.componentSelector[componentName] || hyphenate(componentName);
  }

  protected resolveExtraDirective(componentName: string): string | undefined {
    return this.config.componentExtraSelector?.[componentName];
  }

  protected processLibrarySpecificProp(
    _componentName: string,
    _key: string,
    _rawItem: unknown,
    _props: Record<string, unknown>,
    _attrsArr: string[],
    _description: ICodegenDescription,
    _state: Record<string, unknown>,
    _actionNames?: Set<string>,
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
      const prevInternalTypes = description.internalTypes;
      const localInternalTypes = new Set(prevInternalTypes);
      description.internalTypes = localInternalTypes;

      this.traverseState(item as Record<string, unknown>, description);
      const requiresStateHoist =
        localInternalTypes.has('JSFunction') ||
        localInternalTypes.has('JSResource') ||
        localInternalTypes.has('JSSlot');

      if (requiresStateHoist) {
        description.internalTypes = prevInternalTypes;
        this.hoistPropToState(key, item, attrsArr, state);
        return;
      }

      description.internalTypes = prevInternalTypes;
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
    actionNames?: Set<string>,
    schemaMethods?: Record<string, { value: string }>,
  ): string {
    const eventKey = toEventKey(key);

    if (item?.type === JS_FUNCTION) {
      const fnInfo = this.getFunctionInfo(item.value ?? '');
      if (!fnInfo) {
        return `(${eventKey})=""`;
      }

      this.templateMethodCounter++;
      const methodName = `__handle${this.templateMethodCounter}`;

      let body = fnInfo.body;
      if (actionNames) {
        body = this.transformCallActionCalls(body, actionNames);
      }
      body = body.replace(/this\.props\./g, 'this.');

      const freeVars = this.extractFreeVariables(body);

      let sigParams: string[];
      if (item.params?.length) {
        sigParams = ['$event', ...freeVars, ...item.params];
      } else if (freeVars.length > 0) {
        sigParams = [...freeVars];
      } else {
        sigParams = [];
      }

      const returnType = fnInfo.type ? 'Promise<void>' : 'void';
      const asyncPrefix = fnInfo.type ? `${fnInfo.type} ` : '';
      const paramsWithTypes = sigParams.length > 0
        ? sigParams.map((v) => `${v}: any`).join(', ')
        : '';
      const methodSignature = paramsWithTypes
        ? `${asyncPrefix}${methodName}(${paramsWithTypes}): ${returnType}`
        : `${asyncPrefix}${methodName}(): ${returnType}`;
      this.templateGeneratedMethods.push(`${methodSignature} { ${body} }`);

      const callArgs = sigParams.join(', ');
      return `(${eventKey})="${methodName}(${callArgs})"`;
    }

    if (item?.type !== JS_EXPRESSION) {
      return '';
    }
    const eventHandler = (item.value ?? '').replace(/this\.(props\.)?/g, '');
    if (item.params?.length) {
      const extendParams = item.params.join(',');
      return `(${eventKey})="${eventHandler}($event, ${extendParams})"`;
    }
    if (/^\w+$/.test(eventHandler)) {
      if (schemaMethods && schemaMethods[eventHandler]) {
        const methodInfo = this.getFunctionInfo(schemaMethods[eventHandler].value);
        if (methodInfo && methodInfo.params.length > 0) {
          return `(${eventKey})="${eventHandler}($event)"`;
        }
      }
      return `(${eventKey})="${eventHandler}()"`;
    }
    return `(${eventKey})="${eventHandler}"`;
  }

  protected handleSlotBinding(item: Record<string, unknown> | string): string {
    const { name, params } = (item as { name?: string; params?: string[] | string }) ?? {};
    const slotName = name || (typeof item === 'string' ? item : 'default');
    return `<!-- slot: ${slotName} -->`;
  }

  protected handleBinding(
    props: Record<string, unknown>,
    attrsArr: string[],
    description: ICodegenDescription,
    state: Record<string, unknown>,
    componentName?: string,
    actionNames?: Set<string>,
    schemaMethods?: Record<string, { value: string }>,
  ): void {
    Object.entries(props).forEach(([rawKey, rawItem]) => {
      let key = rawKey === 'className' ? 'class' : rawKey;

      if (this.config.propBlacklist?.[componentName ?? '']?.includes(key)) {
        return;
      }

      const rename = this.config.propRename?.[componentName ?? '']?.[key];
      if (rename) {
        key = rename;
      }

      if (this.processLibrarySpecificProp(componentName ?? '', key, rawItem, props, attrsArr, description, state, actionNames, schemaMethods)) {
        return;
      }

      // === Common Angular logic below ===

      if (key === 'slot') {
        attrsArr.push(this.handleSlotBinding(rawItem as Record<string, unknown> | string));
        return;
      }

      const item = rawItem as { type?: string; value?: string; model?: { prop?: string }; params?: string[] };
      const propType = this.resolvePropValueType(rawItem);

      if (this.isOnEventKey(key)) {
        const eventBinding = this.handleEventBinding(key, item, actionNames, schemaMethods);
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
    actionNames?: Set<string>,
    schemaMethods?: Record<string, { value: string }>,
  ): void {
    if (Array.isArray(children)) {
      result.push(
        children.map((child) => this.generateTemplate(child as CardSchema, state, description, false, actionNames, schemaMethods)).join(''),
      );
      return;
    }
    result.push((children as string) || '');
  }

  protected generateSlotTemplate(
    item: Record<string, any>,
    description: ICodegenDescription,
    state: Record<string, unknown> = {},
    actionNames?: Set<string>,
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
      const conditionValue =
        (condition as { type?: string; value?: string }).type
          ? (condition as { value?: string }).value?.replace(/this\./g, '') ?? condition
          : condition;
      result.push(`{ ${conditionValue} && `);
    }

    result.push(`<${tag} `);
    this.handleBinding(props, attrsArr, description, state, comp, actionNames, schemaMethods);
    result.push(attrsArr.join(' '));

    if (this.voidElements.includes(tag)) {
      result.push(' />');
    } else {
      result.push('>');
      if (Array.isArray(children)) {
        result.push(
          children.map((child) => this.generateSlotTemplate(child, description, state, actionNames, schemaMethods)).join(''),
        );
      } else if ((children as { type?: string })?.type === 'JSExpression') {
        result.push(`{ ${(children as { value?: string }).value?.replace(/this\./g, '') ?? ''} }`);
      } else if ((children as { type?: string })?.type === 'i18n') {
        result.push(`{t('${(children as { key?: string }).key ?? ''}')}`);
      } else {
        result.push((children as string) || '');
      }
      result.push(`</${tag}>`);
    }

    if (condition) {
      result.push(' }');
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

    const builtInTypes = [JS_EXPRESSION, JS_FUNCTION, JS_I18N, JS_RESOURCE, JS_SLOT];
    const { type } = current[prop] || {};
    if (!builtInTypes.includes(type)) {
      return;
    }

    description.internalTypes.add(type);
    const { start, end } = UNWRAP_QUOTES;

    if (type === JS_EXPRESSION) {
      const { value = '', computed = false } = current[prop] || {};
      current[prop] = computed
        ? `${start}computed(${value.replace(/this\./g, '')})${end}`
        : `${start}${value.replace(/this\./g, '')}${end}`;
      return;
    }

    if (type === JS_FUNCTION) {
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

    if (type === JS_I18N) {
      const { key = '' } = current[prop] || {};
      current[prop] = `${start}t("${key}")${end}`;
      return;
    }

    if (type === JS_RESOURCE) {
      const { value = '' } = current[prop] || {};
      current[prop] = `${start}${value.replace(/this\./g, '')}${end}`;
      return;
    }

    const { value = [], params = ['row'] } = current[prop] || {};
    const slotValues = (value as any[]).map((item) => this.generateSlotTemplate(item, description, rootState, undefined, undefined)).join('');
    current[prop] = `${start}({ ${params.join(',')} }, h) => ${slotValues}${end}`;
  }

  protected traverseState(
    state: Record<string, any>,
    description: ICodegenDescription,
    rootState: Record<string, any> = state,
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
    actionNames?: Set<string>,
    schemaMethods?: Record<string, { value: string }>,
  ): string {
    const result: string[] = [];
    const { componentName, loop, loopArgs = ['item'], condition, props = {}, children } = schema;

    if (this.isEmptySlotNode(componentName, children)) {
      return '';
    }

    if (componentName === 'Text' && !isRootNode) {
      const textProp = (props as Record<string, unknown>)['text'];
      if (textProp && typeof textProp === 'object' && (textProp as { type?: string }).type === 'JSExpression') {
        const textValue = (textProp as { value?: string }).value ?? '';
        return `{{ ${textValue.replace(/this\.(props\.)?/g, '')} }}`;
      }
      return `{{ ${(props as Record<string, unknown>)['text'] || ''} }}`;
    }

    let component: string;
    if (isRootNode) {
      component = 'div';
    } else {
      component = this.resolveComponentTag(componentName || 'div');
    }

    if (!isRootNode && componentName) {
      description.componentSet.add(componentName);
    }

    result.push(`\n<${component} `);
    const attrsArr: string[] = [];

    const extraDirective = componentName ? this.resolveExtraDirective(componentName) : undefined;
    if (extraDirective) {
      attrsArr.push(extraDirective);
    }

    if (loop) {
      const loopData = (loop as { type?: string; value?: string }).type
        ? ((loop as { value?: string }).value ?? '').replace(/this\.(props\.)?/g, '')
        : JSON.stringify(loop).replace(/"/g, '&quot;');

      const itemVar = loopArgs[0] || 'item';
      const indexVar = loopArgs[1];
      const indexClause = indexVar ? `; let ${indexVar} = index` : '';
      attrsArr.push(`*ngFor="let ${itemVar} of ${loopData}${indexClause}"`);
    }

    if (typeof condition === 'object' || typeof condition === 'boolean') {
      const isObjectCondition = typeof condition === 'object' && condition !== null;
      const conditionObj = condition as { type?: string; value?: string; kind?: string };
      const conditionValue =
        isObjectCondition && conditionObj.type
          ? (conditionObj.value ?? '').replace(/this\.(props\.)?/g, '')
          : condition;
      const kind = isObjectCondition ? (conditionObj.kind || 'if') : 'if';

      if (kind === 'show') {
        attrsArr.push(`[hidden]="!(${conditionValue})"`);
      } else if (kind === 'else') {
        attrsArr.push(`*ngIf="!(${conditionValue})"`);
      } else {
        attrsArr.push(`*ngIf="${conditionValue}"`);
      }
    }

    this.handleBinding(props as Record<string, unknown>, attrsArr, description, state, componentName, actionNames, schemaMethods);
    result.push(attrsArr.join(' '));

    if (this.voidElements.includes(component)) {
      result.push(' />');
    } else {
      result.push('>');

      const transformedChildren = this.processLibrarySpecificChildren(componentName ?? '', children);
      this.recurseChildren(
        transformedChildren ?? children as NodeSchema[] | NodeSchema | string | undefined,
        state,
        description,
        result,
        actionNames,
        schemaMethods,
      );
      result.push(`</${component}>`);
    }

    return result.join('');
  }

  protected buildStateFields(schema: CardSchema, description: ICodegenDescription): string {
    const { state = {} } = (schema as CardSchema & { state?: Record<string, unknown> });
    this.traverseState(state as Record<string, any>, description);
    const stateStr = unwrapExpression(JSON.stringify(state, null, 2));
    if (!stateStr || stateStr === '{}') {
      return '';
    }
    return `state = ${stateStr};`;
  }

  protected buildMethods(
    schema: CardSchema,
    actionNames: Set<string>,
  ): string {
    const { methods = {} } = (schema as CardSchema & { methods?: Record<string, { value: string }> });
    const methodLines = Object.entries(methods).map(([key, item]) => {
      const info = this.getFunctionInfo(item.value);
      if (!info) {
        let body = item.value.replace(/this\.props\./g, 'this.');
        body = this.transformCallActionCalls(body, actionNames);
        return `${key} = ${body};`;
      }
      const asyncPrefix = info.type ? `${info.type} ` : '';
      const methodName = asyncPrefix && key.startsWith(asyncPrefix.trim())
        ? key.slice(asyncPrefix.length)
        : key;
      let body = info.body.replace(/this\.props\./g, 'this.');
      body = this.transformCallActionCalls(body, actionNames);
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
    const codegenMeta = this.createCodegenMeta();

    this.templateGeneratedMethods = [];
    this.templateMethodCounter = 0;

    const actionNames = new Set<string>();
    const schemaMethods = (schema as CardSchema & { methods?: Record<string, { value: string }> }).methods;

    const template = this.generateTemplate(schema, schema.state as Record<string, any>, codegenMeta, true, actionNames, schemaMethods);
    const stateFields = this.buildStateFields(schema, codegenMeta);

    const methods = this.buildMethods(schema, actionNames);

    const lifeCycles = (schema as CardSchema & { lifeCycles?: Record<string, { type?: string; value?: string }> }).lifeCycles;
    let lifecycleMethods = '';
    if (lifeCycles?.onMounted) {
      const mountedFn = lifeCycles.onMounted;
      const fnInfo = this.getFunctionInfo(mountedFn.value ?? '');
      if (fnInfo) {
        let body = fnInfo.body;
        body = this.transformCallActionCalls(body, actionNames);
        body = body.replace(/this\.props\./g, 'this.');
        lifecycleMethods = `ngOnInit(): void { ${body} }`;
      }
    }

    const hasLifecycle = !!lifecycleMethods;
    const { importStatements, moduleNames } = this.buildImports(codegenMeta, actionNames.size > 0, hasLifecycle);

    const selectorName = hyphenate(name || 'SchemaCard');
    const className = capitalize(name || 'SchemaCard');
    const ngImports = ['CommonModule', 'FormsModule', ...moduleNames].join(', ');
    const implementsClause = hasLifecycle ? ' implements OnInit' : '';

    const outputDeclarations = [...actionNames].map((action) => {
      const prop = this.toCamelCase(action);
      if (prop !== action) {
        return `@Output('${action}') ${prop} = new EventEmitter<Record<string, unknown>>();`;
      }
      return `@Output() ${prop} = new EventEmitter<Record<string, unknown>>();`;
    });

    const generatedMethods = this.templateGeneratedMethods.join('\n');
    const classBody = [stateFields, generatedMethods, lifecycleMethods, methods].filter(Boolean).join('\n\n  ');
    const outputBlock = outputDeclarations.length > 0
      ? `\n  ${outputDeclarations.join('\n  ')}\n`
      : '';

    return [
      importStatements,
      '',
      '@Component({',
      `  selector: 'app-${selectorName}',`,
      '  standalone: true,',
      `  imports: [${ngImports}],`,
      `  template: \`${template}\`,`,
      '  styles: [``],',
      '})',
      `export class ${className}Component${implementsClause} {`,
      outputBlock ? `${outputBlock}` : '',
      classBody ? `  ${classBody}` : '',
      '}',
    ].join('\n');
  }

  override async generate({
    pageInfo,
    formatWithPrettier = false,
  }: ICodeGeneratorParams): Promise<ICodeGeneratorResult> {
    const { schema: originSchema, name = 'SchemaCard' } = pageInfo;

    const schema = JSON.parse(JSON.stringify(this.normalizeIncomingSchema(originSchema))) as CardSchema;
    const angularCode = this.buildAngularComponentSource({ schema, name });
    const panelName = `${hyphenate(name)}.component.ts`;
    const compileErrors: { message: string }[] = [];

    const panel: ICodePanel = {
      panelName,
      panelValue: angularCode,
      panelType: 'angular',
      prettierOpts: {
        semi: false,
        singleQuote: true,
        printWidth: 120,
        trailingComma: 'none',
        endOfLine: 'auto',
        tabWidth: 2,
        parser: 'typescript',
      },
      type: 'page',
    };
    const result: ICodeGeneratorResult = { ...panel, errors: compileErrors };
    if (formatWithPrettier) {
      result.panelValue = await this.formatWithPrettier(result.panelValue, result.prettierOpts as Record<string, unknown>);
    }
    return result;
  }
}
