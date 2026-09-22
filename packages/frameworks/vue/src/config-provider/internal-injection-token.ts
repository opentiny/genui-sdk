import type { InjectionKey, ComputedRef } from 'vue';

export const GENUI_THEME: InjectionKey<ComputedRef<string>> = Symbol('GENUI_THEME');