import '@angular/compiler';

/**
 *   - elementSelector       : 元素型 selector 的标签,如 ['ti-select'] → ti-select
 *   - attributeSelector     : 属性型 selector 的属性,如 ['', 'tiButton', ''] → [{ name: 'tiButton' }];
 *                             带属性值的如 ['input', 'type', 'text'] → [{ name: 'type', value: 'text' }]
 *   - moduleRefMap          : 组件名 → NgModule 类名,如 TiTabs → TiTabModule
 *   - componentExportMap    : 组件名 → 组件类**公开导出名**,如 TiTable → TiTableComponent(供 props.ref 的
 *                             字段类型推导;注意取的是剥掉前导下划线的导出名,见 toExportName)
 *   - componentOutputs      : 组件名 → 真实 @Output 名数组,如 TiPagination → [totalNumberChange,
 *                             currentPageChange, ...](供出码器判定某个 prop 键是不是事件绑定)
 *   - libraryComponents     : 该库全部组件名集合(供出码器按组件名路由到所属库)
 *
 */
export interface IAngularMaterials {
  components?: Record<string, unknown>;
  modules?: Record<string, unknown>;
}

/**
 * 宿主元素上激活该组件的属性选择器。裸属性(只要有这个属性就命中)没有 value:
 * `[tiButton]` → `{ name: 'tiButton' }`;`input[type=text]` → `{ name: 'type', value: 'text' }`。
 */
export interface IAngularAttributeSelector {
  name: string;
  value?: string;
}

export interface IAngularLibraryMaps {
  elementSelector: Record<string, string>;
  attributeSelector: Record<string, IAngularAttributeSelector[]>;
  moduleRefMap: Record<string, string>;
  componentExportMap: Record<string, string>;
  componentOutputs: Record<string, string[]>;
  libraryComponents: Set<string>;
}

/**
 * 从 Angular 组件编译器元数据(ɵcmp)里读到的那部分。
 * selectors 的每一项是**扁平混合数组**(形态见 readPositiveSelector),不是 [标签, 属性, 类] 定长元组。
 */
interface IAngularCmpMeta {
  selectors?: Array<Array<string | number>>;
  outputs?: Record<string, string>;
}

const readCmpMeta = (cls: unknown): IAngularCmpMeta | undefined => (cls as any)?.['ɵcmp'];

const toExportName = (className: unknown): string | null => {
  if (typeof className !== 'string') return null;
  const stripped = className.replace(/^_+/, '');
  return /^[A-Z][A-Za-z0-9_$]*$/.test(stripped) ? stripped : null;
};

/** 属性名合法(HTML 属性名字符集)。不合法即不是能忠实解读的属性段,如运算符选择器 `[href*=x]` 解析出的 `href*` */
const isAttributeName = (value: string): boolean => /^[A-Za-z_][-\w.:]*$/.test(value);

/**
 * 读出 R3 选择器数组**正向段**的元素名与属性选择器。
 *
 * 数组由 Angular 的 parserSelectorToSimpleSelector 拼成:
 * `[元素名, 属性名, 属性值, 属性名, 属性值, ..., 8, 类名, ...]`,其后还可能接 `:not` 段
 * (以带 NOT 位 1 的数字开头,如 3 = 1|2)。属性名与属性值严格成对,裸属性的值为 ''。
 * 属性值在 Angular 解析时就已统一小写(`[type=TEXT]` → `text`),与 R3 匹配的比较口径一致,原样取用即可。
 * 类名(数字 8 引入)与 `:not` 段都不参与出码,**遇到任何数字即收工**,只保证正向段。
 * 故 `button.my-btn` / `ti-upload:not([type])` 都只取到元素名,`:not` 点名的属性不由出码器回避。
 *
 * 注意运算符选择器(`^= $= *= ~= |=`)在 Angular 的 CSS 解析阶段就已失真:实测 `a[href^="http"]`
 * → `['http']`(属性名整个丢掉,值被当成元素名)、`a[href*="x"]` → `['a', 'href*', 'x']`、
 * `a[href$=".pdf"]` 直接抛错。元素名那一侧无法在此识别,库侧不要写运算符选择器。
 */
const readPositiveSelector = (entry: unknown): { element: string; attributes: IAngularAttributeSelector[] } => {
  const tokens = Array.isArray(entry) ? entry : [];
  // 无元素名的选择器([tiButton]、.my-btn)在 Angular 里就是空串
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

export function deriveLibraryMaps(materials: IAngularMaterials): IAngularLibraryMaps {
  const elementSelector: Record<string, string> = {};
  const attributeSelector: Record<string, IAngularAttributeSelector[]> = {};
  const moduleRefMap: Record<string, string> = {};
  const componentExportMap: Record<string, string> = {};
  const componentOutputs: Record<string, string[]> = {};

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

  return {
    elementSelector,
    attributeSelector,
    moduleRefMap,
    componentExportMap,
    componentOutputs,
    libraryComponents: new Set(Object.keys(materials.components ?? {})),
  };
}
