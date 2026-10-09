import GenuiRendererWithMaterials from './GenuiRendererWithMaterials.vue';

/** @deprecated 请改用 `GenuiRenderer`，并通过 `GenuiConfigProvider` 提供物料。 */
export const GenuiLegacyRenderer = GenuiRendererWithMaterials;
export * from '../renderer/config.js';
export * from '../renderer/renderer.types.js';
