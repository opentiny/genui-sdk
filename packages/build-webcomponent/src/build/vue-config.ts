import type { InlineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { createBaseViteConfig, type BaseViteConfigOptions } from './base-config';

export interface WebComponentBuildConfigOptions
  extends Omit<BaseViteConfigOptions, 'frameworkPlugins' | 'alias' | 'dedupe'> {
  /** 把 vue 强制解析到该目录并去重，保证产物里只有一份 Vue */
  vueDir?: string;
  /** 把模板里的标签强制按原生元素编译；物料侧可能真的要用自定义元素，所以默认关闭 */
  nativeElementsOnly?: boolean;
}

export function createWebComponentViteConfig(options: WebComponentBuildConfigOptions): InlineConfig {
  const { vueDir, nativeElementsOnly, ...base } = options;
  const vuePlugin = nativeElementsOnly
    ? vue({ template: { compilerOptions: { isCustomElement: () => false } } })
    : vue();

  return createBaseViteConfig({
    ...base,
    ...(vueDir ? { alias: [{ find: /^vue$/, replacement: vueDir }], dedupe: ['vue'] } : {}),
    frameworkPlugins: [vuePlugin],
  });
}
