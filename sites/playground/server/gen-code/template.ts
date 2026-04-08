import { RootNode, Node } from '@opentiny/genui-sdk-core';
import { insideComponentMapper, componentSelector, componentExtraSelector, componentMapWithPackage, moduleMapWithPackage } from './map';
import schema from '../../../../projects/tiny-schema-renderer-ng/src/mock/schema.json';
import { isOnEvent, toEventName } from './event-utils';
const IDENTIFIER_REGEXP = /^[A-Za-z_$][\w$]*$/;

function stringifyStateObject(state: Record<string, any>): string {
  const json = JSON.stringify(state, null, 2);
  return json.replace(/^(\s*)"([^"\\]+)"(?=\s*:)/gm, (match, indent, key) => {
    return IDENTIFIER_REGEXP.test(key) ? `${indent}${key}` : `${indent}'${key.replace(/'/g, '\\\'')}'`;
  });
}
export const componentTemplate = (imports: string[], importArrays: string[], state: Record<string, any>, methods: { name: string, params: string[], body: string }[], template: string, css: string, componentName: string) => `
${imports.join('\n')}

@Component({
  selector: 'app-${componentName}',
  template: \`${template}\`,
  styles: ['${css || ''}'],
  imports: [${importArrays.join(',')}],
  standalone: true,
})
export class ${componentName}Component {
  public state: any = ${stringifyStateObject(state)};

  ${methods.map(method => `public ${method.name}(${method.params.join(',')}){
   ${method.body}
  }`).join('\n')}
}

`;

export function insideComponentName(componentName: string): boolean {
  return ['Text'].includes(componentName);
}

export function collectionComponentName(schema: RootNode | Node, set = new Set<string>()): Set<string> {
  if (schema.componentName !== 'Page' && !insideComponentName(schema.componentName) && !set.has(schema.componentName)) {
    set.add(schema.componentName);
  }
  if (Array.isArray(schema.children)) {
    schema.children.forEach(child => collectionComponentName(child, set));
  }
  return set;
}

export function genImports(set: Set<string>, componentsMap: Record<string, { exportName: string, package: string }>, moduleMap: Record<string, { module: string, package: string }>): { imports: string[], importArrays: string[] } {
  // set里的组件名根据中不中module里分两类
  const moduleComponents = new Set<string>();
  const standaloneComponents = new Set<string>();
  Array.from(set).forEach(componentName => {
    if (moduleMap[componentName]) {
      moduleComponents.add(componentName);
    } else {
      standaloneComponents.add(componentName);
    }
  });

  const importStatements = [];
  const packages = new Map<string, Set<string>>();

  Array.from(standaloneComponents).forEach(componentName => {
    const component = componentsMap[componentName];
    if (!component) {
      return;
    }
    if (!packages.has(component.package)) {
      packages.set(component.package, new Set<string>());
    }
    packages.get(component.package).add(component.exportName);
  });

  Array.from(moduleComponents).forEach(componentName => {
    const module = moduleMap[componentName];
    if (!packages.has(module.package)) {
      packages.set(module.package, new Set<string>());
    }
    packages.get(module.package).add(module.module);
  });

  [
    { package: '@angular/common', exportName: 'CommonModule' },
    { package: '@angular/forms', exportName: 'FormsModule' },
  ].forEach(item => {
    if (!packages.has(item.package)) {
      packages.set(item.package, new Set<string>());
    }
    packages.get(item.package).add(item.exportName);
  })
  importStatements.push(`import { Component } from '@angular/core';`);
  packages.forEach((exports, packageName) => {

    importStatements.push(`import { ${Array.from(exports).join(',')} } from '${packageName}';`);
  });
  return {
    imports: importStatements,
    importArrays: Array.from(packages.keys())
      .map(key => Array.from(packages.get(key)))
      .reduce((acc, cur) => { return [...acc, ...cur] }, [])
  }
}

export function genState(schema: RootNode): Record<string, any> {
  return schema.state;
}
export function genMethods(schema: RootNode, methodsMap: Record<string, string>): { name: string, params: string[], body: string }[] {
  // 判断是否异步函数，提取参数，提取函数题
  const methods = [];
  [...Object.entries(schema.methods).map(([key, value]) => [key, value.value]), ...Object.entries(methodsMap)].forEach(([key, value]) => {
    const { type, params, body } = parseFunctionString(value);
    methods.push({ name: key, params, body, type });
  });
  return methods;
}
const parseFunctionString = (fnStr: string) => {
  const fnRegexp = /(async)?.*?(\w*)\s*\(([\s\S]*?)\)\s*(=>\s*)?\{([\s\S]*)\}/;
  const result = fnRegexp.exec(fnStr);
  if (result) {
    return { type: result[1] || '', name: result[2], params: result[3].split(',').map(item => item.trim()), body: result[5] };
  }
  console.warn(fnStr, 'not a function');
  return null;
}

export function genTemplate(schema: RootNode | Node, methodsMap: Record<string, string>, scopeArgs: string[] = []): string {
  // 递归便利schema.children，生成template字符串
  if (schema.componentName === 'Page') {
    return `
    <div>
      ${schema.children?.map(child => genTemplate(child, methodsMap, scopeArgs)).join('')}
    </div>
    `;
  }
  if (schema.componentName === 'Text') {
    schema.children = `{{${handleValue(schema.props?.text || '', methodsMap, scopeArgs) || ''}}}`;
    delete schema.props?.text;
  }
  const props = Object.entries(schema.props || {});
  const propertyProps = props.filter(([key, value]) => !isOnEvent(key))
    .filter(([key, value]) => value?.type !== 'JSExpression' || !value?.model)
    .map(([key, value]) =>
      typeof value === 'string'
        ? `${key}="${value}"`
        : (`[${key}]="${handleValue(value, methodsMap, scopeArgs)}"`)
    );

  const modelProps = props.filter(([key, value]) => !isOnEvent(key))
    .filter(([key, value]) => value.type === 'JSExpression' && value.model === true)
    .map(([key, value]) => `[(${key})]="${handleValue(value, methodsMap, scopeArgs)}"`);

  const onProps = props.filter(([key, value]) => isOnEvent(key)).map(([key, value]) => `(${toEventName(key)})="${handleValue(value, methodsMap, scopeArgs, true)}"`);


  const condition = schema.condition ? `*ngIf="${handleValue(schema.condition, methodsMap, scopeArgs)}"` : '';
  const loop = schema.loop ? `*ngFor="let ${schema.loopArgs?.[0] || 'item'} of ${handleValue(schema.loop, methodsMap, scopeArgs)};${schema.loopArgs?.[1] ? `let ${schema.loopArgs?.[1] || 'index'} = index` : ''}"` : '';
  const outsideCondition = !!condition && !!loop;
  const needCloseTag = !['input', 'img', 'br', 'hr', 'link'].includes(mapComponentName(schema.componentName));
  const newScopeArgs = schema.loopArgs ? [...scopeArgs, ...schema.loopArgs] : scopeArgs;

  return `${outsideCondition ? `<ng-container ${condition}>` : ''
    }<${mapComponentName(schema.componentName)} ${!outsideCondition ? condition : ''} ${loop} ${componentExtraSelector[schema.componentName] || ''} ${propertyProps.join(' ')} ${modelProps.join(' ')} ${onProps.join(' ')} >
        ${Array.isArray(schema.children) ? schema.children.map(child => genTemplate(child, methodsMap, newScopeArgs)).join('') : schema.children ?? ''}
   ${needCloseTag ? `</${mapComponentName(schema.componentName)}>` : ''}${outsideCondition ? `</ng-container>` : ''}`;
}

export function genCss(schema: RootNode): string {
  return schema.css;
}

export function genComponentName(schema: RootNode): string {
  return 'AutoGen' + (schema.id || Math.random().toString(36).substring(2, 15));
}

export function genTempleFunction(functionString: string, methodsMap: Record<string, string>, scopeArgs: string[] = []): string {
  const { type, params, name, body } = parseFunctionString(functionString);

  const methodName = (name || `__temp_method`) + `_${Math.random().toString(36).substring(2, 15)}`;

  if (scopeArgs.length > 0) {
    methodsMap[methodName] =
      `${type} function ${methodName}(scope) {
      const {${scopeArgs.join(',')}} = scope;
      return ${functionString};
    }`;
    return `${methodName}({${scopeArgs.join(',')}})`;
  } else {
    methodsMap[methodName] = functionString
    return `${methodName}`;
  }
}

export function handleValue(value: any, methodsMap: Record<string, string>, scopeArgs: string[] = [], event = false,): string {
  if (typeof value === 'string') {
    return `'${value}'`;
  }
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return value;
  }
  if (typeof value === 'object') {
    if (value.type === 'JSExpression') {
      const result = parseFunctionString(value.value);
      if (result) {
        const { type, params, name, body } = result;
        const methodCall = genTempleFunction(value.value, methodsMap, scopeArgs);
        if (event) {
          return `${methodCall}(${params[0] ? `$event` : ''})`;
        }
        return methodCall;
      }

      if (value.params || event) {
        return value.value.replace(/this\./g, '') + `(${(value.params ? ['$event', ...value.params] : []).join(',')})`;
      }
      return value.value.replace(/this\./g, '');

    }
    if (value.type === 'JSFunction') {
      const { params } = parseFunctionString(value.value);
      const methodCall = genTempleFunction(value.value, methodsMap, scopeArgs);
      if (event) {
        return `${methodCall}(${params[0] ? `$event` : ''})`;
      }
      return methodCall;
    }

    return stringifyStateObject(value).replace(/"/g, '\'');
  }
}

export function mapComponentName(componentName: string): string {
  return insideComponentMapper[componentName] || componentSelector[componentName] || componentName;
}

export function genComponent(schema: RootNode, componentsMap: Record<string, { exportName: string, package: string }>, moduleMap: Record<string, { module: string, package: string }>): string {
  const { imports, importArrays } = genImports(collectionComponentName(schema), componentsMap, moduleMap);
  const state = genState(schema);
  const methodsMap = {};
  const template = genTemplate(schema, methodsMap);
  const methods = genMethods(schema, methodsMap);
  const css = genCss(schema);
  const componentName = genComponentName(schema);
  return componentTemplate(imports, importArrays, state, methods, template, css, componentName);
}

export function run(schema: RootNode): string {
  const componentsMap = componentMapWithPackage;
  const moduleMap = moduleMapWithPackage;
  return genComponent(schema, componentsMap, moduleMap);
}

console.log(run(schema));
