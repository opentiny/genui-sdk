declare module '@babel/standalone' {
  export const transform: (
    source: string,
    options: Record<string, unknown>,
  ) => { code?: string };
  export const packages: {
    types: Record<string, any>;
  };
}
