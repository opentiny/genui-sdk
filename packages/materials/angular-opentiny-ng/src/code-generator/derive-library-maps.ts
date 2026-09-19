// 组件编译器元数据(ɵcmp)只有在 JIT 编译器可用时才由 @Component 装饰器补全;
// 物料包里 ng-components.ts 会直接改写 ɵcmp.selectors 补宿主标签,没有这句会在模块
// 加载期崩(实测:报 "PlatformLocation needs to be compiled using the JIT compiler")。
// 必须排在本文件读取 ɵcmp 之前,故置于文件首行。
import '@angular/compiler';

/**
 * 从 Angular 组件库物料包自动推导组件映射表(通用,各组件库复用)。
 *
 * 原理:物料包已收集 组件名 → 组件类 / 模块类。组件类的 Angular 编译器
 * 元数据 ɵcmp.selectors 含真实选择器(结构为 [tag, attr, cls]),模块类的
 * .name 即 NgModule 类名,由此推导:
 *   - componentSelector      : 元素型 selector 的 tag,如 ['ti-select'] → ti-select
 *   - componentExtraSelector : 属性型 selector 的 attr,如 ['', 'tiButton', ''] → [tiButton]
 *   - moduleRefMap           : 组件名 → NgModule 类名,如 TiTabs → TiTabModule
 *   - componentExportMap     : 组件名 → 组件类**公开导出名**,如 TiTable → TiTableComponent(供 props.ref 的
 *                              字段类型推导;注意取的是剥掉前导下划线的导出名,见 toExportName)
 *   - componentOutputs       : 组件名 → 真实 @Output 名数组,如 TiPagination → [totalNumberChange,
 *                              currentPageChange, ...](供出码器判定某个 prop 键是不是事件绑定)
 *   - libraryComponents      : 该库全部组件名集合(供出码器按组件名路由到所属库)
 *
 * 注意:部分组件在 TinyNG 中按「宿主原生元素 + 属性指令」使用(如 <button tiButton>、
 * <input tiText>),组件类本身是属性型 selector,编译元数据里没有宿主标签;这类宿主标签
 * 由本物料包源码在模块加载时显式补齐到 ɵcmp(见 ng-components.ts),
 * 因此这里可全部从元数据推导,无需调用方另行覆盖。
 *
 * 位置说明:本文件原在出码器包(libraries/derive-library-maps.ts),按评审意见随出码配置
 * 一并迁到物料包——推导读的是**本包的** ɵcmp 元数据,放在自己家里最顺;代价是将来每个
 * 物料包各带一份(约 70 行纯函数)。
 */
export interface IAngularMaterials {
  components?: Record<string, unknown>;
  modules?: Record<string, unknown>;
}

export interface IAngularLibraryMaps {
  componentSelector: Record<string, string>;
  componentExtraSelector: Record<string, string>;
  moduleRefMap: Record<string, string>;
  componentExportMap: Record<string, string>;
  componentOutputs: Record<string, string[]>;
  libraryComponents: Set<string>;
}

/** 从 Angular 组件编译器元数据(ɵcmp)里读到的那部分:选择器与输出 */
interface IAngularCmpMeta {
  selectors?: Array<[string, string, string]>;
  outputs?: Record<string, string>;
}

const readCmpMeta = (cls: unknown): IAngularCmpMeta | undefined => (cls as any)?.['ɵcmp'];

/**
 * 取组件类的**公开导出名**:物料包里的类是内部名(如 `_TiTableComponent`),对外导出的是
 * 去掉前导下划线的 `TiTableComponent`——实测 `@opentiny/ng` 只导出后者(341 个导出里
 * 有 `TiTableComponent`、没有 `_TiTableComponent`),直接拿内部名去 import 会编译不过。
 * 本包 24 个组件剥掉前导下划线后全部命中导出,故统一剥前缀后再用。
 *
 * 剥离后仍要过 `^[A-Z]` 校验:物料包若被压缩,类名会退化成 `t` 这种,那会 import 一个不存在
 * 的符号。这类直接跳过,让该组件的 ref 字段类型退化成 any,而不是静默产出编译不过的代码。
 */
const toExportName = (className: unknown): string | null => {
  if (typeof className !== 'string') return null;
  const stripped = className.replace(/^_+/, '');
  return /^[A-Z][A-Za-z0-9_$]*$/.test(stripped) ? stripped : null;
};

export function deriveLibraryMaps(materials: IAngularMaterials): IAngularLibraryMaps {
  const componentSelector: Record<string, string> = {};
  const componentExtraSelector: Record<string, string> = {};
  const moduleRefMap: Record<string, string> = {};
  const componentExportMap: Record<string, string> = {};
  const componentOutputs: Record<string, string[]> = {};

  Object.entries(materials.components ?? {}).forEach(([name, cls]) => {
    const meta = readCmpMeta(cls);
    const entry = meta?.selectors?.[0];
    if (entry?.[0]) componentSelector[name] = entry[0];

    if (entry && typeof entry[1] === 'string' && entry[1]) {
      componentExtraSelector[name] = entry[1];
    }

    const outputs = Object.keys(meta?.outputs ?? {});
    if (outputs.length) componentOutputs[name] = outputs;

    const exportName = toExportName((cls as { name?: unknown })?.name);
    if (exportName) componentExportMap[name] = exportName;
  });

  Object.entries(materials.modules ?? {}).forEach(([name, mod]) => {
    moduleRefMap[name] = (mod as any).name;
  });

  return {
    componentSelector,
    componentExtraSelector,
    moduleRefMap,
    componentExportMap,
    componentOutputs,
    libraryComponents: new Set(Object.keys(materials.components ?? {})),
  };
}
