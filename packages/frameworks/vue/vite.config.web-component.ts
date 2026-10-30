import path from 'path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin, type UserConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { visualizer } from 'rollup-plugin-visualizer';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import { createWebComponentDts } from './src/web-component/dts';

/** 仓库内只构建随包发布的 OpenTiny Vue 物料这一份，其他物料由使用方通过 CLI 自行构建 */
export const WEB_COMPONENT_MATERIAL_ENTRY = '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
export const WEB_COMPONENT_MATERIAL_KEY = 'vue-opentiny-vue';
export const WEB_COMPONENT_OUTPUT_NAME = 'genui-config-renderer';

export const GENUI_MATERIALS_VIRTUAL_ID = 'virtual:genui-materials';
const RESOLVED_MATERIALS_ID = '\0' + GENUI_MATERIALS_VIRTUAL_ID;

// 兼容两种加载方式：vite 打包配置时会注入 __dirname，而直接 import 时只有 import.meta.url
declare const __dirname: string | undefined;
const configDir = typeof __dirname === 'string' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

function genuiMaterialsPlugin(): Plugin {
  return {
    name: 'genui-web-component-materials',
    resolveId(id) {
      return id === GENUI_MATERIALS_VIRTUAL_ID ? RESOLVED_MATERIALS_ID : null;
    },
    load(id) {
      if (id !== RESOLVED_MATERIALS_ID) return null;
      return [
        `import { materials as __genuiMaterials } from ${JSON.stringify(WEB_COMPONENT_MATERIAL_ENTRY)};`,
        'export const materials = __genuiMaterials;',
        `export const materialKey = ${JSON.stringify(WEB_COMPONENT_MATERIAL_KEY)};`,
      ].join('\n');
    },
  };
}

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

export function createWebComponentConfig(options: WebComponentBuildOptions = {}): UserConfig {
  const { mode = 'production' } = options;

  return {
    root: path.resolve(configDir, './'),
    // 产物被浏览器直接 <script type="module"> 加载，必须静态替换 process.env.NODE_ENV，
    // 否则 Vue 等依赖里的 `process.env.NODE_ENV` 守卫会抛 ReferenceError: process is not defined
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
    plugins: [
      genuiMaterialsPlugin(),
      mode === 'analyze'
        ? visualizer({
            open: true,
            filename: 'stats.web-component.html',
          })
        : null,
      vue({
        template: {
          compilerOptions: {
            isCustomElement: () => false,
          },
        },
      }),
      cssInjectedByJsPlugin(),
      genuiDtsPlugin(),
    ],
    build: {
      lib: {
        entry: path.resolve(configDir, './src/web-component/index.ts'),
        formats: ['es'],
        // lib.fileName 为函数时 Vite 不会自动补扩展名
        fileName: () => `${WEB_COMPONENT_OUTPUT_NAME}.js`,
      },
      outDir: path.resolve(configDir, './dist/web-component'),
      emptyOutDir: true,
      sourcemap: false,
      // Web Component 需要将所有依赖打包进去
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
          format: 'es',
        },
      },
      chunkSizeWarningLimit: 2000,
    },
  };
}

export default defineConfig(({ mode }) => createWebComponentConfig({ mode }));
