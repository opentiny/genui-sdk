import type { InjectionKey } from 'vue';
import type { IMaterials } from '@opentiny/genui-sdk-core';

// 单独成模块是为了保证 provide / inject 用的是同一个 Symbol 引用
export const GENUI_BAKED_MATERIALS: InjectionKey<IMaterials> = Symbol('GENUI_BAKED_MATERIALS');
