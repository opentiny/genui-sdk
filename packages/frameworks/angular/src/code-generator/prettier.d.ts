declare module 'prettier/standalone' {
  export function format(source: string, options?: Record<string, unknown>): Promise<string>;
}

declare module 'prettier/plugins/html' {
  const plugin: Record<string, unknown>;
  export default plugin;
}

declare module 'prettier/plugins/babel' {
  const plugin: Record<string, unknown>;
  export default plugin;
}

declare module 'prettier/plugins/estree' {
  const plugin: Record<string, unknown>;
  export default plugin;
}
