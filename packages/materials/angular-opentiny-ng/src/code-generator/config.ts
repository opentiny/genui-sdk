import '@angular/compiler';

import { materials } from '../materials';
import { deriveMaterialsMaps } from './derive-materials-maps';
import type { IAngularMaterialsConfig } from './types';

const {
  elementSelector,
  moduleRefMap,
  attributeSelector,
  componentExportMap,
  componentOutputs,
  materialsComponents,
} = deriveMaterialsMaps(materials);

export const TINYNG_CONFIG: IAngularMaterialsConfig = {
  elementSelector,
  attributeSelector,
  moduleRefMap,
  libraryPackage: '@opentiny/ng',
  componentExportMap,
  propBlacklist: { TiTable: ['border', 'stripe'] },
  componentOutputs,
  materialsComponents,
};
