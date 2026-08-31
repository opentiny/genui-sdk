/**
 * TinyNG 组件映射表 —— 基于物料包自动推导 + 宿主标签最小覆盖。

 * 必须先 import '@angular/compiler' 启用 JIT(顺序在物料包 import 之前)。
 */
import '@angular/compiler';
import { materials } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/materials';
import { deriveLibraryMaps } from '../derive-library-maps';

/**
 * 物料包元数据缺失的宿主标签覆盖表(仅此 5 个)。
 * 库的使用约定中，无法从物料包推导,故在此做最小化覆盖;其余组件全部自动推导。
 */
const HOST_TAG_OVERRIDE: Record<string, string> = {
  TiButton: 'button',
  TiText: 'input',
  TiTextArea: 'textarea',
  TiRadio: 'input',
  TiCheckbox: 'input',
};

const maps = deriveLibraryMaps(materials, HOST_TAG_OVERRIDE);

// TiItemLabel 是 TiFormfieldModule 的内部组件,未随物料包导出(物料包无此组件类)。
// 出码时 TiItem 的 label 属性会剥离为 <ti-item-label> 子元素(见 record.md 第 4 节),
// 需手工补映射:selector 约定为 ti-item-label,模块复用已导入的 TiFormfieldModule。
maps.componentSelector['TiItemLabel'] = 'ti-item-label';
maps.moduleRefMap['TiItemLabel'] = 'TiFormfieldModule';
maps.libraryComponents.add('TiItemLabel');

export const componentSelector = maps.componentSelector;
export const componentExtraSelector = maps.componentExtraSelector;
export const moduleRefMap = maps.moduleRefMap;
export const libraryComponents = maps.libraryComponents;
