import type { InjectionKey } from 'vue';
import type { IMaterials } from '@opentiny/genui-sdk-core';

export interface GenuiConfigProviderInstance {
  setMaterials(materials: IMaterials): void;
}

export const GENUI_CONFIG_PROVIDER: InjectionKey<GenuiConfigProviderInstance> = Symbol('GENUI_CONFIG_PROVIDER');
