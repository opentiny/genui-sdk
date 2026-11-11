import '@angular/compiler';

import type { IAngularAttributeSelector, IAngularDirectiveConfig } from './types';

export interface IAngularMaterials {
  components?: Record<string, unknown>;
  modules?: Record<string, unknown>;
  directives?: Record<string, unknown>;
  directivesModuleMap?: Record<string, unknown>;
}

export interface IAngularMaterialsMaps {
  elementSelector: Record<string, string>;
  attributeSelector: Record<string, IAngularAttributeSelector[]>;
  moduleRefMap: Record<string, string>;
  componentExportMap: Record<string, string>;
  componentOutputs: Record<string, string[]>;
  materialsComponents: Set<string>;
  directiveMap: Record<string, IAngularDirectiveConfig>;
}

interface IAngularCmpMeta {
  selectors?: Array<Array<string | number>>;
  outputs?: Record<string, string>;
}

const readCmpMeta = (cls: unknown): IAngularCmpMeta | undefined => (cls as any)?.['ɵcmp'];

interface IAngularDirMeta {
  selectors?: Array<Array<string | number>>;
  outputs?: Record<string, unknown>;
}

const readDirMeta = (cls: unknown): IAngularDirMeta | undefined => (cls as any)?.['ɵdir'];

const toExportName = (className: unknown): string | null => {
  if (typeof className !== 'string') return null;
  const stripped = className.replace(/^_+/, '');
  return /^[A-Z][A-Za-z0-9_$]*$/.test(stripped) ? stripped : null;
};


const isAttributeName = (value: string): boolean => /^[A-Za-z_][-\w.:]*$/.test(value);

const readPositiveSelector = (entry: unknown): { element: string; attributes: IAngularAttributeSelector[] } => {
  const tokens = Array.isArray(entry) ? entry : [];

  const element = typeof tokens[0] === 'string' ? tokens[0] : '';
  const attributes: IAngularAttributeSelector[] = [];

  for (let i = 1; i < tokens.length; i += 2) {
    const name = tokens[i];
    if (typeof name !== 'string' || !isAttributeName(name)) {
      break;
    }
    const value = tokens[i + 1];
    attributes.push(typeof value === 'string' && value ? { name, value } : { name });
  }

  return { element, attributes };
};

export function deriveMaterialsMaps(materials: IAngularMaterials): IAngularMaterialsMaps {
  const elementSelector: Record<string, string> = {};
  const attributeSelector: Record<string, IAngularAttributeSelector[]> = {};
  const moduleRefMap: Record<string, string> = {};
  const componentExportMap: Record<string, string> = {};
  const componentOutputs: Record<string, string[]> = {};
  const directiveMap: Record<string, IAngularDirectiveConfig> = {};

  Object.entries(materials.components ?? {}).forEach(([name, cls]) => {
    const meta = readCmpMeta(cls);
    const { element, attributes } = readPositiveSelector(meta?.selectors?.[0]);
    if (element) elementSelector[name] = element;
    if (attributes.length) attributeSelector[name] = attributes;

    const outputs = Object.keys(meta?.outputs ?? {});
    if (outputs.length) componentOutputs[name] = outputs;

    const exportName = toExportName((cls as { name?: unknown })?.name);
    if (exportName) componentExportMap[name] = exportName;
  });

  Object.entries(materials.modules ?? {}).forEach(([name, mod]) => {
    moduleRefMap[name] = (mod as any).name;
  });

  Object.entries(materials.directives ?? {}).forEach(([name, cls]) => {
    const meta = readDirMeta(cls);
    const { element, attributes } = readPositiveSelector(meta?.selectors?.[0]);
    // 出码只能靠选择器命中,元素型/class 型选择器挂不到任意宿主上,跳过(自检会报未声明)
    if (element || !attributes.length) {
      return;
    }
    const moduleName = toExportName((materials.directivesModuleMap?.[name] as { name?: unknown })?.name);
    const directiveName = toExportName((cls as { name?: unknown })?.name);
    const importSymbol = moduleName ?? directiveName;
    if (!importSymbol) {
      return;
    }
    directiveMap[name] = {
      selector: attributes[0],
      importSymbol,
      outputs: Object.keys(meta?.outputs ?? {}),
    };
  });
  // - elementSelector       : 元素型 selector 的标签,如 ['ti-select'] → ti-select
  // - attributeSelector     : 属性型 selector 的属性,如 ['', 'tiButton', ''] → [{ name: 'tiButton' }]; 带属性值的如 ['input', 'type', 'text'] → [{ name: 'type', value: 'text' }]                     
  // - moduleRefMap          : 组件名 → NgModule 类名,如 TiTabs → TiTabModule
  // - componentExportMap    : 组件名 → 组件类**公开导出名**,如 TiTable → TiTableComponent(供 props.ref 的字段类型推导;注意取的是剥掉前导下划线的导出名,见 toExportName)
  // - componentOutputs      : 组件名 → 真实 @Output 名数组,如 TiPagination → [totalNumberChange, currentPageChange, ...](供出码器判定某个 prop 键是不是事件绑定)
  // - materialsComponents   : 该物料包全部组件名集合(供出码器按组件名路由到所属物料包)
  return {
    elementSelector,
    attributeSelector,
    moduleRefMap,
    componentExportMap,
    componentOutputs, // 用于判断组件里是否有非on前缀的事件
    materialsComponents: new Set(Object.keys(materials.components ?? {})),
    directiveMap, // 指令名 → 宿主属性选择器 + imports 符号
  };
}
