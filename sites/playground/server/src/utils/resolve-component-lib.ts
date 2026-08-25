import type { IFrameworkKey } from '../types/playground-config.js';

export type IComponentLibKey = 'TinyVue' | 'ElementPlus' | 'TinyNg' | (string & {});

const DEFAULT_COMPONENT_LIB: Record<string, IComponentLibKey> = {
  Vue: 'TinyVue',
  Angular: 'TinyNg',
};

export function resolveComponentLib(
  framework?: string,
  componentLib?: string | null,
): IComponentLibKey {
  const fw = (framework || 'Vue') as IFrameworkKey;
  if (componentLib) {
    return componentLib as IComponentLibKey;
  }
  return DEFAULT_COMPONENT_LIB[fw] ?? 'TinyVue';
}
