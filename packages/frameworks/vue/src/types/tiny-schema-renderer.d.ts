declare module '@opentiny/tiny-schema-renderer' {
  export const RENDERER_SETTINGS_KEY: symbol;

  export interface SchemaRenderer {
    getContext(): any;
    [key: string]: any;
  }

  const SchemaRenderer: any;
  export default SchemaRenderer;
}

declare module '@opentiny/tiny-schema-renderer/transform-jsx' {
  export function transformJSX(code: string, customElements: Record<string, any>): string;
}
