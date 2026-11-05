import { buildAngularWebComponent } from './angular';
import { buildReactWebComponent } from './react';
import { buildVueWebComponent } from './vue';
import type { BuildWebComponentOptions, BuildWebComponentResult } from './shared';

export * from './shared';
export { buildAngularWebComponent, buildReactWebComponent, buildVueWebComponent };

/** 按框架选择对应的构建实现 */
export function buildWebComponent(options: BuildWebComponentOptions): Promise<BuildWebComponentResult> {
  switch (options.framework) {
    case 'react':
      return buildReactWebComponent(options);
    case 'angular':
      return buildAngularWebComponent(options);
    case 'vue':
    default:
      return buildVueWebComponent(options);
  }
}
