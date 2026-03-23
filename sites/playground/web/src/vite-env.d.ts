/// <reference types="vite/client" />

declare module '@opentiny/tiny-schema-renderer' {
  export function registerMaterial(name: string, source: unknown): void;
  export function clearMaterials(): void;
  export function setNotify(fn: (opts: { type: string; title: string; message: string }) => void): void;
}

declare module '@opentiny/genui-sdk-materials-vue-opentiny-vue/extend-renderer' {
  export const MATERIAL_NAME: string;
  export const componentMap: Record<string, unknown>;
  export const componentResolver: (name: string) => unknown;
  export const notifyAdapter: (opts: { type: string; title: string; message: string }) => void;
}
