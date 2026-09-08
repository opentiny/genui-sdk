/**
 * 从 Angular 组件库物料包自动推导组件映射表(通用,各组件库复用)。
 *
 * 原理:物料包已收集 组件名 → 组件类 / 模块类。组件类的 Angular 编译器
 * 元数据 ɵcmp.selectors 含真实选择器(结构为 [tag, attr, cls]),模块类的
 * .name 即 NgModule 类名,由此推导:
 *   - componentSelector      : 元素型 selector 的 tag,如 ['ti-select'] → ti-select
 *   - componentExtraSelector : 属性型 selector 的 attr,如 ['', 'tiButton', ''] → [tiButton]
 *   - moduleRefMap           : 组件名 → NgModule 类名,如 TiTabs → TiTabModule
 *   - libraryComponents      : 该库全部组件名集合(供「组件库识别」比对 schema)
 *
 * 注意:部分组件在 TinyNG 中按「宿主原生元素 + 属性指令」使用(如 <button tiButton>、
 * <input tiText>),组件类本身是属性型 selector,编译元数据里没有宿主标签;这类宿主标签
 * 由物料包源码在模块加载时显式补齐到 ɵcmp(见 angular-opentiny-ng 物料包 ng-components.ts),
 * 因此这里可全部从元数据推导,无需调用方另行覆盖。
 */
export interface IAngularMaterials {
  components?: Record<string, unknown>;
  modules?: Record<string, unknown>;
}

export interface IAngularLibraryMaps {
  componentSelector: Record<string, string>;
  componentExtraSelector: Record<string, string>;
  moduleRefMap: Record<string, string>;
  libraryComponents: Set<string>;
}

/** Angular 组件编译器元数据(ɵcmp)中的 selectors 结构:[tag, attr, cls] */
interface IAngularCmpMeta {
  selectors?: Array<[string, string, string]>;
}

const readCmpMeta = (cls: unknown): IAngularCmpMeta | undefined => (cls as any)?.['ɵcmp'];

export function deriveLibraryMaps(materials: IAngularMaterials): IAngularLibraryMaps {
  const componentSelector: Record<string, string> = {};
  const componentExtraSelector: Record<string, string> = {};
  const moduleRefMap: Record<string, string> = {};

  Object.entries(materials.components ?? {}).forEach(([name, cls]) => {
    const entry = readCmpMeta(cls)?.selectors?.[0];
    if (entry?.[0]) componentSelector[name] = entry[0];

    if (entry && typeof entry[1] === 'string' && entry[1]) {
      componentExtraSelector[name] = entry[1];
    }
  });

  Object.entries(materials.modules ?? {}).forEach(([name, mod]) => {
    moduleRefMap[name] = (mod as any).name;
  });

  return {
    componentSelector,
    componentExtraSelector,
    moduleRefMap,
    libraryComponents: new Set(Object.keys(materials.components ?? {})),
  };
}
