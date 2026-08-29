/**
 * TinyNG 组件映射表 —— 基于物料包自动推导 + 宿主标签最小覆盖。
 *
 * 通用推导逻辑见 derive-library-maps.ts(各组件库复用);本文件只保留
 * TinyNG 专属的两部分:物料包入口与宿主标签覆盖表。
 *
 * 运行环境:@opentiny/ng 为 partial 编译产物,在纯 Node/tsx 下加载组件类前
 * 必须先 import '@angular/compiler' 启用 JIT(顺序在物料包 import 之前)。
 */
import '@angular/compiler';
import { materials } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/materials';
import { deriveLibraryMaps } from '../derive-library-maps';

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

const maps = deriveLibraryMaps(materials, HOST_TAG_OVERRIDE);

export const componentSelector = maps.componentSelector;
export const componentExtraSelector = maps.componentExtraSelector;
export const moduleRefMap = maps.moduleRefMap;
export const libraryComponents = maps.libraryComponents;
