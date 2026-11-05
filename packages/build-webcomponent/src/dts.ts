import type { Framework } from './args';

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
