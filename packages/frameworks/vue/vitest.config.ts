import { defineConfig } from 'vitest/config';

// 单独放一个配置,避免 vitest 去加载本包 vite.config.ts 里的 dts / css-injection 插件
export default defineConfig({ test: { environment: 'node' } });
