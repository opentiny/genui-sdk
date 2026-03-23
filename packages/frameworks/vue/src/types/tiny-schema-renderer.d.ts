export const RENDERER_SETTINGS_KEY: symbol;
export const MATERIAL_REGISTRY_KEY: symbol;
export const Mapper: Record<string, unknown>;
export function registerMaterial(name: string, source: unknown): void;
export function unregisterMaterial(name: string): void;
export function clearMaterials(): void;
export function setNotify(fn: (opts: { type: string; title: string; message: string }) => void): void;
declare const _default: any;
export default _default;
