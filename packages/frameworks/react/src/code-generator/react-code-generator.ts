import type { CardSchema, NodeSchema } from '@opentiny/genui-sdk-core';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';
import { JS_EXPRESSION, JS_FUNCTION, JS_I18N, JS_RESOURCE, JS_SLOT, VOID_ELEMENTS } from './constants';
import { validateByCompile } from './react-tsx-validator';
import { transformStateMutations } from './state-mutation-transform';
import type {
  ICodeGeneratorParams,
  ICodeGeneratorResult,
  ICodegenMeta,
  IComponentMapItem,
  IFrameworkCodeGenerator,
  IFunctionInfo,
  IPropDefinition,
  IReactCodeGeneratorOptions,
} from './types';

const DEFAULT_PRETTIER_OPTS: Record<string, unknown> = {
  semi: true,
  singleQuote: true,
  printWidth: 120,
  trailingComma: 'all',
  endOfLine: 'auto',
  tabWidth: 2,
  parser: 'typescript',
};

function isProtocolValue(value: unknown, type: string): value is Record<string, any> {
  return !!value && typeof value === 'object' && (value as { type?: string }).type === type;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isIdentifier(value: string): boolean {
  return /^[$A-Z_a-z][$\w]*$/.test(value);
}

function quoteString(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r/g, '\\r').replace(/\n/g, '\\n')}'`;
}

function indent(source: string, size = 2): string {
  const spaces = ' '.repeat(size);
  return source
    .split('\n')
    .map((line) => (line ? `${spaces}${line}` : line))
    .join('\n');
}

function parseInlineStyle(value: string): Record<string, string> {
  const result: Record<string, string> = {};
  value.split(';').forEach((part) => {
    const colon = part.indexOf(':');
    if (colon < 0) return;
    const rawKey = part.slice(0, colon).trim();
    const styleValue = part.slice(colon + 1).trim();
    if (!rawKey || !styleValue) return;
    const key = rawKey.startsWith('--') ? rawKey : rawKey.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
    result[key] = styleValue;
  });
  return result;
}

export class ReactCodeGenerator implements IFrameworkCodeGenerator<ICodeGeneratorParams, ICodeGeneratorResult> {
  private readonly prettierOpts: Record<string, unknown>;
  private readonly enableCompileValidation: boolean;

  constructor(options: IReactCodeGeneratorOptions = {}) {
    this.prettierOpts = { ...DEFAULT_PRETTIER_OPTS, ...(options.prettierOpts ?? {}) };
    this.enableCompileValidation = options.enableCompileValidation !== false;
  }

  protected createCodegenMeta(scopeId?: string): ICodegenMeta {
    return {
      componentSet: new Set(),
      needsCallAction: false,
      needsEffect: false,
      needsRef: false,
      needsSetIn: false,
      needsTextFallback: false,
      scopeId,
    };
  }

  protected normalizeIncomingSchema(origin: CardSchema | string | null | undefined): CardSchema {
    if (origin == null || (typeof origin === 'string' && !origin.trim())) {
      return { componentName: 'Page', children: [] } as CardSchema;
    }
    if (typeof origin === 'string') {
      try {
        return JSON.parse(origin) as CardSchema;
      } catch {
        return { componentName: 'Page', children: [] } as CardSchema;
      }
    }
    return origin;
  }

  protected normalizeComponentsMap(componentsMap: IComponentMapItem[] | undefined): IComponentMapItem[] {
    const deduped = new Map<string, IComponentMapItem>();
    for (const item of componentsMap ?? []) {
      if (item.componentName && item.package && !deduped.has(item.componentName)) {
        deduped.set(item.componentName, item);
      }
    }
    return [...deduped.values()];
  }

  protected toComponentName(name: string): string {
    const words = name.split(/[^$\w]+/).filter(Boolean);
    const joined = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join('');
    const safe = joined || 'SchemaCard';
    return /^\d/.test(safe) ? `Schema${safe}` : safe;
  }

  protected toScopeId(name: string): string {
    const normalized = name
      .replace(/([a-z\d])([A-Z])/g, '$1-$2')
      .replace(/[^a-zA-Z\d_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
    return normalized || 'schema-card';
  }

  protected getFunctionInfo(source: string): IFunctionInfo | null {
    const functionMatch = /^\s*(async\s+)?function(?:\s+[$\w]+)?\s*\(([^)]*)\)\s*\{([\s\S]*)\}\s*$/.exec(source);
    if (functionMatch) {
      return {
        async: !!functionMatch[1],
        params: functionMatch[2]
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        body: functionMatch[3].trim(),
      };
    }
    const arrowMatch = /^\s*(async\s+)?(?:\(([^)]*)\)|([$\w]+))\s*=>\s*(?:\{([\s\S]*)\}|([\s\S]*))\s*$/.exec(source);
    if (!arrowMatch) return null;
    return {
      async: !!arrowMatch[1],
      params: (arrowMatch[2] || arrowMatch[3] || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      body: arrowMatch[4]?.trim() ?? `return ${arrowMatch[5].trim()}`,
    };
  }

  protected replaceContext(source: string, meta: ICodegenMeta, transformMutations = false): string {
    let result = transformMutations ? transformStateMutations(source) : source;
    if (transformMutations && result !== source) meta.needsSetIn = true;
    if (/\bthis\.callAction\b/.test(result)) meta.needsCallAction = true;
    result = result
      .replace(/\bthis\.state\b/g, 'state')
      .replace(/\bthis\.props\b/g, 'props')
      .replace(/\bthis\.refs\b/g, 'refs')
      .replace(/\bthis\.callAction\b/g, 'callAction')
      .replace(/\bthis\.(?=[$A-Z_a-z])/g, '');
    return result;
  }

  protected buildFunctionExpression(source: string, meta: ICodegenMeta): string {
    const transformed = transformStateMutations(source);
    if (transformed !== source) meta.needsSetIn = true;
    const info = this.getFunctionInfo(transformed);
    if (!info) return this.replaceContext(transformed, meta);
    const body = this.replaceContext(info.body, meta);
    return `${info.async ? 'async ' : ''}(${info.params.join(', ')}) => { ${body} }`;
  }

  protected serializeValue(value: unknown, meta: ICodegenMeta): string {
    if (isProtocolValue(value, JS_EXPRESSION) || isProtocolValue(value, JS_RESOURCE)) {
      return this.replaceContext(String(value.value ?? ''), meta);
    }
    if (isProtocolValue(value, JS_FUNCTION)) {
      return this.buildFunctionExpression(String(value.value ?? ''), meta);
    }
    if (isProtocolValue(value, JS_I18N)) {
      return quoteString(String(value.key ?? ''));
    }
    if (isProtocolValue(value, JS_SLOT)) {
      const params = Array.isArray(value.params) && value.params.length ? value.params : ['scope'];
      const slotChildren = Array.isArray(value.value) ? value.value : [];
      const rendered = slotChildren.map((child) => this.renderNode(child as NodeSchema, meta)).filter(Boolean);
      const body = rendered.length === 1 ? rendered[0] : `<>${rendered.join('')}</>`;
      return `(${params.join(', ')}) => ${body || 'null'}`;
    }
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.serializeValue(item, meta)).join(', ')}]`;
    }
    if (isPlainObject(value)) {
      const entries = Object.entries(value).map(([key, item]) => {
        const property = isIdentifier(key) ? key : JSON.stringify(key);
        return `${property}: ${this.serializeValue(item, meta)}`;
      });
      return `{ ${entries.join(', ')} }`;
    }
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return quoteString(value);
    return JSON.stringify(value);
  }

  protected buildRefAttribute(value: Record<string, any>, meta: ICodegenMeta): string | null {
    const expression = String(value.value ?? '').trim();
    const simple = /^(?:this\.)?refs\.([$\w]+)$/.exec(expression);
    if (!simple) return null;
    meta.needsRef = true;
    return `ref={(instance) => { refs.${simple[1]} = instance }}`;
  }

  protected buildEventAttribute(key: string, value: Record<string, any>, meta: ICodegenMeta): string {
    let handler = '';
    if (value.type === JS_FUNCTION) {
      handler = this.buildFunctionExpression(String(value.value ?? ''), meta);
    } else if (value.type === JS_EXPRESSION) {
      handler = this.replaceContext(String(value.value ?? ''), meta);
    }
    if (!handler) return '';
    if (Array.isArray(value.params) && value.params.length) {
      handler = `(...eventArgs) => (${handler})(...eventArgs, ${value.params.join(', ')})`;
    }
    return `${key}={${handler}}`;
  }

  protected buildAttributes(props: Record<string, unknown>, meta: ICodegenMeta, keyExpression?: string): string {
    const attributes: string[] = [];
    if (keyExpression) attributes.push(`key={${keyExpression}}`);
    for (const [rawKey, rawValue] of Object.entries(props)) {
      const key = rawKey === 'class' ? 'className' : rawKey;
      if (key === 'ref' && isProtocolValue(rawValue, JS_EXPRESSION)) {
        const refAttribute = this.buildRefAttribute(rawValue, meta);
        if (refAttribute) attributes.push(refAttribute);
        continue;
      }
      if (/^on[A-Z]/.test(key) && isPlainObject(rawValue)) {
        const eventAttribute = this.buildEventAttribute(key, rawValue, meta);
        if (eventAttribute) attributes.push(eventAttribute);
        continue;
      }
      if (isProtocolValue(rawValue, JS_EXPRESSION) || isProtocolValue(rawValue, JS_RESOURCE)) {
        attributes.push(`${key}={${this.serializeValue(rawValue, meta)}}`);
        continue;
      }
      if (
        isProtocolValue(rawValue, JS_FUNCTION) ||
        isProtocolValue(rawValue, JS_SLOT) ||
        typeof rawValue !== 'string'
      ) {
        attributes.push(`${key}={${this.serializeValue(rawValue, meta)}}`);
        continue;
      }
      if (key === 'style') {
        attributes.push(`style={${this.serializeValue(parseInlineStyle(rawValue), meta)}}`);
      } else if (/["\\\r\n]/.test(rawValue)) {
        // JSX 属性字符串不支持反斜杠转义，含引号、反斜杠或换行时改用表达式写法。
        attributes.push(`${key}={${quoteString(rawValue)}}`);
      } else {
        attributes.push(`${key}=${JSON.stringify(rawValue)}`);
      }
    }
    if (meta.scopeId) {
      attributes.push(`data-genui-scope=${JSON.stringify(meta.scopeId)}`);
    }
    return attributes.join(' ');
  }

  protected renderElement(node: NodeSchema, meta: ICodegenMeta, keyExpression?: string, isRoot = false): string {
    const componentName = isRoot ? 'div' : node.componentName || 'div';
    const isHtmlElement = /^[a-z]/.test(componentName);
    if (!isHtmlElement) {
      meta.componentSet.add(componentName);
      if (componentName === 'Text') meta.needsTextFallback = true;
    }
    const attributes = this.buildAttributes((node.props ?? {}) as Record<string, unknown>, meta, keyExpression);
    const start = attributes ? `<${componentName} ${attributes}` : `<${componentName}`;
    const children = node.children;
    if (VOID_ELEMENTS.has(componentName)) return `${start} />`;
    if (Array.isArray(children) && children.length) {
      return `${start}>${children.map((child) => this.renderNode(child as NodeSchema, meta)).join('')}</${componentName}>`;
    }
    if (typeof children === 'string') return `${start}>{${JSON.stringify(children)}}</${componentName}>`;
    return `${start} />`;
  }

  protected renderNode(node: NodeSchema, meta: ICodegenMeta, isRoot = false): string {
    if (!node || (!isRoot && !node.componentName)) return '';
    const loop = node.loop as Record<string, unknown> | undefined;
    const condition = node.condition as Record<string, unknown> | boolean | undefined;
    if (loop) {
      const loopExpression = this.serializeValue(loop, meta);
      const [item = 'item', index = 'index'] = node.loopArgs ?? [];
      const element = this.renderElement(node, meta, index, isRoot);
      const conditional = condition == null ? element : `${this.serializeValue(condition, meta)} ? ${element} : null`;
      return `{${loopExpression}.map((${item}, ${index}) => (${conditional}))}`;
    }
    const element = this.renderElement(node, meta, undefined, isRoot);
    if (condition == null || condition === true) return element;
    if (condition === false) return '{false && null}';
    return `{${this.serializeValue(condition, meta)} ? ${element} : null}`;
  }

  protected getPropDefinitions(schema: CardSchema): IPropDefinition[] {
    const groups =
      (schema.schema as { properties?: { content?: Record<string, unknown>[] }[] } | undefined)?.properties ?? [];
    const definitions = new Map<string, IPropDefinition>();
    for (const group of groups) {
      for (const item of group.content ?? []) {
        const name = typeof item.property === 'string' ? item.property : '';
        if (!name || definitions.has(name)) continue;
        definitions.set(name, {
          name,
          type: this.toTypeScriptType(String(item.type ?? 'unknown')),
          defaultValue: item.defaultValue,
        });
      }
    }
    return [...definitions.values()];
  }

  protected toTypeScriptType(type: string): string {
    const normalized = type.toLowerCase();
    if (normalized === 'string') return 'string';
    if (normalized === 'number') return 'number';
    if (normalized === 'boolean') return 'boolean';
    if (normalized === 'array') return 'unknown[]';
    if (normalized === 'object') return 'Record<string, unknown>';
    if (normalized === 'function') return '(...args: unknown[]) => unknown';
    return 'unknown';
  }

  protected buildPropsInterface(componentName: string, definitions: IPropDefinition[]): string {
    const fields = definitions.map(
      (item) => `  ${isIdentifier(item.name) ? item.name : JSON.stringify(item.name)}?: ${item.type};`,
    );
    return `export interface ${componentName}Props {\n${fields.join('\n')}${fields.length ? '\n' : ''}  [key: string]: unknown;\n}`;
  }

  protected buildPropsStatement(definitions: IPropDefinition[], meta: ICodegenMeta): string {
    const defaults = definitions.filter((item) => item.defaultValue !== undefined);
    if (!defaults.length) return 'const props = inputProps';
    const entries = defaults.map(
      (item) =>
        `${isIdentifier(item.name) ? item.name : JSON.stringify(item.name)}: ${this.serializeValue(item.defaultValue, meta)}`,
    );
    return `const props = { ${entries.join(', ')}, ...inputProps }`;
  }

  protected buildState(schema: CardSchema, meta: ICodegenMeta): { statement: string; accessors: string } {
    const source = isPlainObject(schema.state) ? schema.state : {};
    const state: Record<string, unknown> = {};
    const accessorLines: string[] = [];
    for (const [name, value] of Object.entries(source)) {
      const stateValue = isPlainObject(value) ? value : null;
      const accessor = stateValue && isPlainObject(stateValue.accessor) ? stateValue.accessor : null;
      if (!accessor) {
        state[name] = value;
        continue;
      }
      if (stateValue && stateValue.defaultValue !== undefined) state[name] = stateValue.defaultValue;
      const getter = isPlainObject(accessor.getter) ? String(accessor.getter.value ?? '') : '';
      const getterInfo = this.getFunctionInfo(getter);
      const getterExpression = getterInfo
        ? `(${getterInfo.async ? 'async ' : ''}() => { ${this.replaceContext(getterInfo.body, meta, true)} })()`
        : `(${this.replaceContext(getter, meta)})()`;
      accessorLines.push(`const ${name} = ${getterExpression}`);
    }
    const entries = Object.entries(state).map(
      ([key, value]) => `${isIdentifier(key) ? key : JSON.stringify(key)}: ${this.serializeValue(value, meta)}`,
    );
    const formatted = entries.length ? `{\n  ${entries.join(',\n  ')}\n}` : '{}';
    return {
      statement: `const [state, setState] = useState(() => (${formatted}))`,
      accessors: accessorLines.join('\n'),
    };
  }

  protected buildRefs(schema: CardSchema, meta: ICodegenMeta): string {
    const refs = isPlainObject(schema.refs) ? schema.refs : {};
    if (!Object.keys(refs).length && !meta.needsRef) return '';
    meta.needsRef = true;
    return `const refs = useRef<Record<string, any>>(${this.serializeValue(refs, meta)}).current`;
  }

  protected buildMethods(schema: CardSchema, meta: ICodegenMeta): string {
    const methods = isPlainObject(schema.methods) ? schema.methods : {};
    return Object.entries(methods)
      .map(([name, value]) => {
        const source = isPlainObject(value) ? String(value.value ?? '') : '';
        const transformed = transformStateMutations(source);
        if (transformed !== source) meta.needsSetIn = true;
        const info = this.getFunctionInfo(transformed);
        if (!info) return `const ${name} = ${this.replaceContext(transformed, meta)}`;
        const body = this.replaceContext(info.body, meta);
        return `${info.async ? 'async ' : ''}function ${name}(${info.params.join(', ')}) { ${body} }`;
      })
      .join('\n\n');
  }

  protected buildCallAction(meta: ICodegenMeta): string {
    if (!meta.needsCallAction) return '';
    return `function callAction(name: string, params?: unknown) {\n  console.warn(\`[GenUI] callAction("\${name}") must be implemented for exported code.\`, params)\n}`;
  }

  protected buildLifeCycles(schema: CardSchema, meta: ICodegenMeta): string {
    const lifeCycles = isPlainObject(schema.lifeCycles) ? schema.lifeCycles : {};
    const mounted = isPlainObject(lifeCycles.onMounted) ? String(lifeCycles.onMounted.value ?? '') : '';
    const unmounted = isPlainObject(lifeCycles.onUnmounted) ? String(lifeCycles.onUnmounted.value ?? '') : '';
    if (!mounted && !unmounted) return '';
    meta.needsEffect = true;
    const sections: string[] = [];
    if (mounted) sections.push(`const onMounted = ${this.buildFunctionExpression(mounted, meta)}`);
    if (unmounted) sections.push(`const onUnmounted = ${this.buildFunctionExpression(unmounted, meta)}`);
    const effectBody = [mounted ? 'void onMounted()' : '', unmounted ? 'return () => { void onUnmounted() }' : '']
      .filter(Boolean)
      .join('\n');
    sections.push(`useEffect(() => {\n${indent(effectBody)}\n}, [])`);
    return sections.join('\n\n');
  }

  protected buildSetInHelper(meta: ICodegenMeta): string {
    if (!meta.needsSetIn) return '';
    return `function setIn(source: Record<string, any>, path: PropertyKey[], value: unknown) {
  if (!path.length) return typeof value === 'function' ? (value as (current: unknown) => unknown)(source) : value
  const root = Array.isArray(source) ? [...source] : { ...source }
  let current: any = root
  let previous: any = source
  for (let index = 0; index < path.length - 1; index++) {
    const key = path[index]
    const previousChild = previous?.[key]
    current[key] = Array.isArray(previousChild) ? [...previousChild] : { ...previousChild }
    current = current[key]
    previous = previousChild
  }
  const key = path[path.length - 1]
  const nextValue = typeof value === 'function' ? (value as (current: unknown) => unknown)(previous?.[key]) : value
  if (nextValue === undefined) delete current[key]
  else current[key] = nextValue
  return root
}`;
  }

  protected buildTextFallback(meta: ICodegenMeta, componentsMap: IComponentMapItem[]): string {
    if (!meta.needsTextFallback || componentsMap.some((item) => item.componentName === 'Text')) return '';
    return `function Text({ text, children, ...props }: { text?: React.ReactNode; children?: React.ReactNode; [key: string]: unknown }) {\n  return <span {...props}>{children ?? text}</span>\n}`;
  }

  protected buildImports(meta: ICodegenMeta, componentsMap: IComponentMapItem[]): string {
    const hooks = ['useState', ...(meta.needsEffect ? ['useEffect'] : []), ...(meta.needsRef ? ['useRef'] : [])];
    const lines = [`import React, { ${hooks.join(', ')} } from 'react'`];
    const packages = new Map<string, IComponentMapItem[]>();
    const memberDeclarations: string[] = [];
    for (const item of componentsMap) {
      if (!meta.componentSet.has(item.componentName)) continue;
      const entries = packages.get(item.package) ?? [];
      entries.push(item);
      packages.set(item.package, entries);
    }
    for (const [packageName, items] of packages) {
      const namedImports = new Map<string, string>();
      const getExportPath = (item: IComponentMapItem) => item.exportName || item.componentName;

      for (const item of items.filter((entry) => isIdentifier(getExportPath(entry)))) {
        const exportName = getExportPath(item);
        const localName = namedImports.get(exportName);
        if (localName && localName !== item.componentName) {
          memberDeclarations.push(`const ${item.componentName} = ${localName}`);
        } else {
          namedImports.set(exportName, item.componentName);
        }
      }

      for (const item of items.filter((entry) => !isIdentifier(getExportPath(entry)))) {
        const exportPath = getExportPath(item);
        const segments = exportPath.split('.');
        if (!segments.length || segments.some((segment) => !isIdentifier(segment))) continue;
        const [rootExport, ...memberPath] = segments;
        let rootLocal = namedImports.get(rootExport);
        if (!rootLocal) {
          rootLocal = rootExport;
          namedImports.set(rootExport, rootLocal);
        }
        memberDeclarations.push(`const ${item.componentName} = ${rootLocal}.${memberPath.join('.')}`);
      }

      const imports = [...namedImports].map(([exportName, localName]) =>
        exportName === localName ? exportName : `${exportName} as ${localName}`,
      );
      if (imports.length) lines.push(`import { ${imports.join(', ')} } from '${packageName}'`);
    }
    if (memberDeclarations.length) lines.push('', ...memberDeclarations);
    return lines.join('\n');
  }

  protected scopeCss(css: string, scopeId: string, errors: { message: string }[] = []): string {
    if (!css.trim()) return '';
    try {
      const root = postcss.parse(css);
      root.walkRules((rule) => {
        if (rule.parent?.type === 'atrule' && /keyframes$/i.test(rule.parent.name)) return;
        rule.selector = selectorParser((selectors) => {
          selectors.each((selector) => {
            let target: selectorParser.Node | undefined;
            selector.each((node) => {
              if (node.type !== 'pseudo' && node.type !== 'combinator') target = node;
            });
            const attribute = selectorParser.attribute({
              attribute: 'data-genui-scope',
              operator: '=',
              value: scopeId,
              raws: {},
              quoteMark: '"',
            });
            if (target) selector.insertAfter(target as never, attribute);
            else selector.prepend(attribute);
          });
        }).processSync(rule.selector);
      });
      return root.toString();
    } catch (error) {
      // 非法 CSS 不能让 generate() 直接 reject，回退为未加作用域的原始样式并上报错误。
      errors.push({
        message: `Failed to scope page css: ${error instanceof Error ? error.message : String(error)}`,
      });
      return css;
    }
  }

  protected buildReactSource(
    schema: CardSchema,
    name: string,
    componentsMap: IComponentMapItem[],
    errors: { message: string }[] = [],
  ): string {
    const componentName = this.toComponentName(name);
    const scopeId = schema.css ? this.toScopeId(name) : undefined;
    const meta = this.createCodegenMeta(scopeId);
    meta.needsCallAction = /\bthis\.callAction\b/.test(JSON.stringify(schema));
    const root = this.renderNode(schema as NodeSchema, meta, true);
    const definitions = this.getPropDefinitions(schema);
    const propsInterface = this.buildPropsInterface(componentName, definitions);
    const propsStatement = this.buildPropsStatement(definitions, meta);
    const state = this.buildState(schema, meta);
    const refs = this.buildRefs(schema, meta);
    const methods = this.buildMethods(schema, meta);
    const lifeCycles = this.buildLifeCycles(schema, meta);
    const callAction = this.buildCallAction(meta);
    const scopedCss = schema.css && scopeId ? this.scopeCss(schema.css, scopeId, errors) : '';
    const returnValue = scopedCss
      ? `<>
  <style>{${JSON.stringify(scopedCss)}}</style>
  ${root}
</>`
      : root;
    const componentBody = [propsStatement, state.statement, state.accessors, refs, callAction, methods, lifeCycles]
      .filter(Boolean)
      .join('\n\n');
    const helpers = [this.buildSetInHelper(meta), this.buildTextFallback(meta, componentsMap)]
      .filter(Boolean)
      .join('\n\n');
    const imports = this.buildImports(meta, componentsMap);
    return `${imports}

${propsInterface}
${helpers ? `\n${helpers}\n` : ''}
export default function ${componentName}(inputProps: ${componentName}Props = {}) {
${indent(componentBody)}

  return (
${indent(returnValue, 4)}
  )
}`;
  }

  protected async formatWithPrettier(source: string): Promise<string> {
    try {
      const [{ format }, { default: typescriptPlugin }, { default: estreePlugin }] = await Promise.all([
        import('prettier/standalone'),
        import('prettier/plugins/typescript'),
        import('prettier/plugins/estree'),
      ]);
      return await format(source, { ...this.prettierOpts, plugins: [typescriptPlugin, estreePlugin] });
    } catch {
      return source;
    }
  }

  async generate({
    pageInfo,
    componentsMap = [],
    formatWithPrettier = false,
  }: ICodeGeneratorParams): Promise<ICodeGeneratorResult> {
    const name = pageInfo.name || 'SchemaCard';
    const schema = JSON.parse(JSON.stringify(this.normalizeIncomingSchema(pageInfo.schema))) as CardSchema;
    const normalizedComponentsMap = this.normalizeComponentsMap(componentsMap);
    const errors: { message: string }[] = [];
    const source = this.buildReactSource(schema, name, normalizedComponentsMap, errors);
    const panelName = `${name}.tsx`;
    if (this.enableCompileValidation) errors.push(...validateByCompile(panelName, source));
    return {
      panelName,
      panelValue: formatWithPrettier ? await this.formatWithPrettier(source) : source,
      panelType: 'react',
      prettierOpts: { ...this.prettierOpts },
      type: 'page',
      errors,
    };
  }
}

export const generateCode = (params: ICodeGeneratorParams): Promise<ICodeGeneratorResult> =>
  new ReactCodeGenerator().generate(params);
