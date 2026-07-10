import { InjectionToken, type Signal } from '@angular/core';
import type { MaterialDefaultValueMap } from '@opentiny/genui-sdk-core';
import type { IRendererMaterials } from '@opentiny/tiny-schema-renderer-ng';

export const GENUI_DEFAULT_PROPS_MAP = new InjectionToken<MaterialDefaultValueMap>('GENUI_DEFAULT_PROPS_MAP');

export const GENUI_MATERIALS = new InjectionToken<Signal<IRendererMaterials>>('GENUI_MATERIALS');
