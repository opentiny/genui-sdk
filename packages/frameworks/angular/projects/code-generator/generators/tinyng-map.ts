/**
 * TinyNG 组件映射表 —— 运行时从物料包自动推导。
 *
 * 原理:物料包 @opentiny/genui-sdk-materials-angular-opentiny-ng 已收集
 * 组件名 → 组件类 / 模块类。组件类的 Angular 编译器元数据 ɵcmp.selectors
 * 含真实选择器(结构为 [tag, attr, cls]),模块类的 .name 即 NgModule 类名,
 * 由此自动推导三张映射表,替代手写维护:
 *   - componentSelector      : 元素型 selector 的 tag,如 ['ti-select']
 *   - componentExtraSelector : 属性型 selector 的 attr,如 ['', 'tiButton', ''] → [tiButton]
 *   - moduleRefMap           : 组件名 → NgModule 类名,如 TiTabs → TiTabModule
 *
 * 注意:部分原生表单组件(TiButton/TiText/TiTextarea/TiRadio/TiCheckbox)在
 * 物料包 ng-components.ts 中被显式补齐了原生标签 selector('button'/'input'/'textarea'),
 * 因此推导出的 tag 是它们在模板中实际使用的标签。
 *
 * 运行环境:@opentiny/ng 为 partial 编译产物,在纯 Node/tsx 下加载组件类前
 * 必须先 import '@angular/compiler' 启用 JIT(顺序在物料包 import 之前)。
 */
import '@angular/compiler';
import { materials } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/materials';

const { components, modules } = materials;

/** Angular 组件编译器元数据(ɵcmp)中的 selectors 结构:[tag, attr, cls] */
interface IAngularCmpMeta {
  selectors?: Array<[string, string, string]>;
}

const readCmpMeta = (cls: unknown): IAngularCmpMeta | undefined => (cls as any)?.['ɵcmp'];

export const moduleRefMap: Record<string, string> = {};
export const componentSelector: Record<string, string> = {};
export const componentExtraSelector: Record<string, string> = {};

Object.entries(components ?? {}).forEach(([name, cls]) => {
  const entry = readCmpMeta(cls)?.selectors?.[0];
  if (entry?.[0]) componentSelector[name] = entry[0]; // 元素型:['ti-select']
  // 属性型 selector 的属性名,如 ['', 'tiButton', ''] → 'tiButton'。
  // 注意部分组件的 selectors 是复合编码结构(如 TiUpload 的 ['ti-upload', 3, 'type', '']),
  // entry[1] 可能是数字标记,须排除,不能当作属性名。
  if (entry && typeof entry[1] === 'string' && entry[1]) {
    componentExtraSelector[name] = entry[1];
  }
});

Object.entries(modules ?? {}).forEach(([name, mod]) => {
  moduleRefMap[name] = (mod as any).name;
});

/**
 * 物料包元数据缺失的宿主标签覆盖表(仅此 5 个)。
 * 这些原生表单组件在 @opentiny/ng 中是纯属性选择器([tiButton] 等),
 * 组件类元数据里没有宿主元素标签(button/input/textarea),该信息只存在于
 * 库的使用约定中、无法从物料包推导,故在此做最小化覆盖;其余组件全部自动推导。
 */
const HOST_TAG_OVERRIDE: Record<string, string> = {
  TiButton: 'button',
  TiText: 'input',
  TiTextArea: 'textarea',
  TiRadio: 'input',
  TiCheckbox: 'input',
};
Object.entries(HOST_TAG_OVERRIDE).forEach(([name, tag]) => {
  componentSelector[name] = tag;
});

/** 该库的全部组件名集合,供「组件库识别」比对 schema 用 */
export const libraryComponents: Set<string> = new Set(Object.keys(components ?? {}));
