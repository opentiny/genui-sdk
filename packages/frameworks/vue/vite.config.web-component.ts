import path from 'path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin, type UserConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { createMaterialsPlugin, createWebComponentViteConfig } from './src/web-component/build-config';
import { createWebComponentDts } from './src/web-component/dts';

/** 仓库内只构建随包发布的 OpenTiny Vue 物料这一份，其他物料由使用方通过 CLI 自行构建 */
export const WEB_COMPONENT_MATERIAL_ENTRY = '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
export const WEB_COMPONENT_MATERIAL_KEY = 'vue-opentiny-vue';
export const WEB_COMPONENT_OUTPUT_NAME = 'genui-config-renderer';

// 兼容两种加载方式：vite 打包配置时会注入 __dirname，而直接 import 时只有 import.meta.url
declare const __dirname: string | undefined;
const configDir = typeof __dirname === 'string' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

/** 与 CLI 产物保持一致的 .d.ts */
function genuiDtsPlugin(): Plugin {
  return {
    name: 'genui-web-component-dts',
    buildStart() {
      this.emitFile({
        type: 'asset',
        fileName: `${WEB_COMPONENT_OUTPUT_NAME}.d.ts`,
        source: createWebComponentDts(),
      });
    },
  };
}

export interface WebComponentBuildOptions {
  mode?: string;
}

/** 默认链路的构建配置：位置、物料、产物名固定，其余走共用配置 */
export function createWebComponentConfig(options: WebComponentBuildOptions = {}): UserConfig {
  const { mode = 'production' } = options;

  return createWebComponentViteConfig({
    root: configDir,
    entry: path.resolve(configDir, './src/web-component/index.ts'),
    outDir: path.resolve(configDir, './dist/web-component'),
    fileName: WEB_COMPONENT_OUTPUT_NAME,
    emptyOutDir: true,
    virtualModulesPlugin: createMaterialsPlugin(WEB_COMPONENT_MATERIAL_ENTRY, WEB_COMPONENT_MATERIAL_KEY),
    plugins: [
      ...(mode === 'analyze' ? [visualizer({ open: true, filename: 'stats.web-component.html' })] : []),
      genuiDtsPlugin(),
    ],
    nativeElementsOnly: true,
    chunkSizeWarningLimit: 2000,
  });
}

export default defineConfig(({ mode }) => createWebComponentConfig({ mode }));
