import '@angular/compiler';
import { materials } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/materials';
import { deriveLibraryMaps } from '../derive-library-maps';

const maps = deriveLibraryMaps(materials);

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
