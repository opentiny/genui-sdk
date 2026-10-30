export function createWebComponentDts(): string {
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
