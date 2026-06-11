import type { Component, InjectionKey } from 'vue';

export const GENUI_I18N = Symbol('GENUI_I18N');
export const GENUI_RENDERER = Symbol('GENUI_RENDERER');
export const GENUI_CONFIG = Symbol('GENUI_CONFIG');
export const CUSTOM_CONTEXT = Symbol('CUSTOM_CONTEXT');

/** Schema 渲染器使用的 Genui 组件物料表。 */
export type GenuiMaterials = Record<string, Component>;

export const GENUI_MATERIALS: InjectionKey<GenuiMaterials> = Symbol('GENUI_MATERIALS');
