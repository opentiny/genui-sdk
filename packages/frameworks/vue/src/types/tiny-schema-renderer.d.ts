declare module '@opentiny/tiny-schema-renderer' {
  export const RENDERER_SETTINGS_KEY: symbol;

  export default class SchemaRenderer {
    getContext(): any;
    setContext(ctx: any): void;
    setState(state: any): void;
    [key: string]: any;
  }
}

declare module '@opentiny/tiny-schema-renderer/transform-jsx' {
  export function transformJSX(code: string, customElements?: Record<string, any>): string;
}
