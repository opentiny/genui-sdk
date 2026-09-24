declare module '@opentiny/tiny-schema-renderer' {
  export const RENDERER_SETTINGS_KEY: symbol;

  export default class SchemaRenderer {
    getContext(): any;
    setContext(ctx: any, clear?: boolean): void;
    setState(state: any, clear?: boolean): void;
    [key: string]: any;
  }
}

declare module '@opentiny/tiny-schema-renderer/transform-jsx' {
  export function transformJSX(code: string, customElements?: Record<string, any>): string;
}
