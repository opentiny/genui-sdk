import type { Framework } from './args';

/**
 * 三端共用的产物声明。
 *
 * 产物是打包后的单文件实现，没有可推导的类型源，所以这里用静态模板描述公开契约：
 * 元素构造函数、注册函数、以及各框架下导出形态的差异（Angular 的注册是异步的）。
 */
export function createWebComponentDts(framework: Framework, minimalExports = false): string {
  if (minimalExports) {
    return 'export declare const GenuiConfigRendererElement: CustomElementConstructor;\n';
  }

  if (framework === 'angular') {
    return [
      'export declare const materialKey: string;',
      'export declare const materials: Record<string, any>;',
      'export declare const GENUI_CONFIG_RENDERER_TAG: string;',
      'export declare const GenuiConfigRendererElement: Promise<CustomElementConstructor>;',
      'export declare function registerGenuiConfigRenderer(tagName?: string): Promise<CustomElementConstructor>;',
      'export declare function defineGenuiConfigRenderer(tagName?: string, materials?: Record<string, any>): Promise<CustomElementConstructor>;',
      '',
    ].join('\n');
  }

  return [
    'export declare const materialKey: string;',
    'export declare const materials: Record<string, any>;',
    'export declare const GENUI_CONFIG_RENDERER_TAG: string;',
    'export declare const GenuiConfigRendererElement: CustomElementConstructor;',
    'export declare function registerGenuiConfigRenderer(tagName?: string, element?: CustomElementConstructor): void;',
    'export declare function createGenuiConfigRendererElement(materials?: Record<string, any>): CustomElementConstructor;',
    '',
  ].join('\n');
}
