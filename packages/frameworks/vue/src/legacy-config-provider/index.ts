import GenuiLegacyConfigProviderImpl from './GenuiLegacyConfigProvider.vue';

/** @deprecated 仅用于旧版组件兼容，新项目请使用 `GenuiConfigProvider` 并显式提供物料。 */
export const GenuiLegacyConfigProvider = GenuiLegacyConfigProviderImpl;
export type { LegacyConfigProviderProps } from './legacy-config-provider.types.js';
