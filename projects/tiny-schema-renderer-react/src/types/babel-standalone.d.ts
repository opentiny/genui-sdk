declare module '@babel/standalone' {
  export type BabelNode = any;
  export const transform: (
    source: string,
    options: Record<string, unknown>,
  ) => { code?: string };
  export const packages: {
    types: Record<string, any>;
  };
}
