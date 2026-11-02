import type { InjectionKey, ComputedRef } from 'vue';
import type { IMaterials, ThemeColorScheme } from '@opentiny/genui-sdk-core';

export interface GenuiConfigState {
  colorScheme: ThemeColorScheme;
  id: string;
}

export const GENUI_I18N = Symbol('GENUI_I18N');
export const GENUI_CONFIG: InjectionKey<ComputedRef<GenuiConfigState>> = Symbol('GENUI_CONFIG');
export const GENUI_MATERIALS: InjectionKey<IMaterials> = Symbol('GENUI_MATERIALS');
