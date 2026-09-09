import '@angular/compiler';
import { materials } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/materials';
import { deriveLibraryMaps } from '../derive-library-maps';

const maps = deriveLibraryMaps(materials);

export const componentSelector = maps.componentSelector;
export const componentExtraSelector = maps.componentExtraSelector;
export const moduleRefMap = maps.moduleRefMap;
export const libraryComponents = maps.libraryComponents;
