import type { ConfigProviderProps } from '../config-provider/ConfigProvider.vue';

export type LegacyConfigProviderProps = Omit<ConfigProviderProps, 'materials'>;
