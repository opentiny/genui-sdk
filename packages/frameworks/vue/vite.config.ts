import path from 'path';
import { defineConfig } from 'vite';
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
        bundledPackages: ['zod', 'zod-to-json-schema'],
        include: ['src'],
        // CLI 为纯 Node 脚本，不需要对外类型，且引用了 vite 等构建期依赖
        exclude: ['src/web-component-cli/**'],
        compilerOptions: {
          skipLibCheck: true,
        },
      }),
    ],
    build: {
      cssCodeSplit: true,
      lib: {
        entry: {
          index: path.resolve(__dirname, './src/index.ts'),
          chat: path.resolve(__dirname, './src/chat/index.ts'),
          'legacy-config-provider': path.resolve(__dirname, './src/legacy-config-provider/index.ts'),
          'legacy-chat': path.resolve(__dirname, './src/legacy-chat/index.ts'),
          renderer: path.resolve(__dirname, './src/renderer/index.ts'),
          'legacy-renderer': path.resolve(__dirname, './src/legacy-renderer/index.ts'),
          'config-provider': path.resolve(__dirname, './src/config-provider/index.ts'),
          'transform-jsx': path.resolve(__dirname, './src/transform-jsx.ts'),
          'code-generator': path.resolve(__dirname, './src/code-generator/index.ts'),
          'web-component-factory': path.resolve(__dirname, './src/web-component/factories.ts'),
          'web-component-cli': path.resolve(__dirname, './src/web-component-cli/bin.ts'),
        },
        formats: ['es'],
        fileName: (_, entryName) => `${entryName}.js`,
      },
      outDir: path.resolve(__dirname, './dist'),
      sourcemap: true,
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
          // CLI 使用 node 内置模块，浏览器产物中不涉及
          /^node:/,
        ],
      },
    },
  };
});
