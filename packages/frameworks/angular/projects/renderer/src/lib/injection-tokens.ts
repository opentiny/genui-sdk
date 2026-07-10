import { InjectionToken } from '@angular/core';
import type { MaterialDefaultValueMap } from '@opentiny/genui-sdk-core';
import type { GenuiConfigStore } from './config-provider/config-store';

export const GENUI_DEFAULT_PROPS_MAP = new InjectionToken<MaterialDefaultValueMap>('GENUI_DEFAULT_PROPS_MAP');

export const GENUI_CONFIG = new InjectionToken<GenuiConfigStore>('GENUI_CONFIG');
