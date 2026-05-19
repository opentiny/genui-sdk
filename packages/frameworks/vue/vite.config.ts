import path from 'path';
import { defineConfig, PluginOption } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import escapeStringRegexp from 'escape-string-regexp';
import dts from 'vite-plugin-dts';
import vue from '@vitejs/plugin-vue';
import packageJson from './package.json';

export default defineConfig(({ mode }) => {
  return {
    root: path.resolve(__dirname, './'),
    plugins: [
      vue(),
      cssInjectedByJsPlugin({
        relativeCSSInjection: true,
      }),
      mode === 'analyze'
        ? visualizer({
            open: true,
          })
        : null,
      dts({
        rollupTypes: true,
        bundledPackages: [
          '@opentiny/genui-sdk-core',
          '@opentiny/genui-sdk-materials-vue-opentiny-vue',
          '@opentiny/tiny-schema-renderer',
          'zod',
          'zod-to-json-schema',
        ],
        compilerOptions: {
          paths: {
            // 临时规避此包无.d.ts文件的问题
            '@opentiny/tiny-schema-renderer': ['../src/types/tiny-schema-renderer.d.ts'],
            '@opentiny/tiny-schema-renderer/transform-jsx': ['../src/types/tiny-schema-renderer.d.ts'],
          },
          include: ['../src/types/tiny-schema-renderer.d.ts'],
        },
      }),
    ],
    build: {
      cssCodeSplit: true,
      lib: {
        entry: {
          index: path.resolve(__dirname, './src/index.ts'),
          chat: path.resolve(__dirname, './src/chat/index.ts'),
          renderer: path.resolve(__dirname, './src/renderer/index.ts'),
          'config-provider': path.resolve(__dirname, './src/config-provider/index.ts'),
          'transform-jsx': path.resolve(__dirname, './src/transform-jsx.ts'),
        },
        formats: ['es'],
        fileName: (_, entryName) => `${entryName}.js`,
      },
      outDir: path.resolve(__dirname, './output/dist'),
      sourcemap: false,
      terserOptions: {
        mangle: {
          toplevel: true,
        },
        format: {
          comments: false,
        },
      },
      rollupOptions: {
        external: [
          ...Object.keys(packageJson.dependencies || {}).map((name) => new RegExp(`^${escapeStringRegexp(name)}(/|$)`)),
        ]
      },
    },
  };
});
