/**
 * 把 Vue / React 的工厂源码预编译成 `dist/frameworks/*` 里可直接打包的 JS。
 *
 * 预编译产物只保留 import 语句：
 * - genui 运行时（`@opentiny/genui-sdk-*`）与 TinyVue 主包由本包 dependencies 提供，使用方不需要单独安装；
 * - 框架本身（`vue` / `react`）与 TinyVue 子包由使用方项目提供，保证运行时单例。
 */
import { build } from 'vite';
import vue from '@vitejs/plugin-vue';
import react from '@vitejs/plugin-react';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

async function bundle({ name, entry, plugins, external }) {
  await build({
    configFile: false,
    root: packageRoot,
    logLevel: 'warn',
    plugins,
    build: {
      lib: {
        entry: path.join(packageRoot, entry),
        formats: ['es'],
        fileName: () => 'index.js',
      },
      outDir: path.join(packageRoot, 'dist/frameworks', name),
      emptyOutDir: true,
      cssCodeSplit: false,
      minify: 'esbuild',
      rollupOptions: {
        external,
        output: { inlineDynamicImports: true, format: 'es' },
      },
    },
  });
  console.log(`[genui web-component] 预编译 ${name} 工厂完成`);
}

await bundle({
  name: 'vue',
  entry: 'src/frameworks/vue/factories.ts',
  plugins: [vue(), cssInjectedByJsPlugin()],
  // genui SDK 与 TinyVue 主包由 CLI 的 dependencies 提供；Vue 本身和 TinyVue 子包由使用方项目提供
  external: [/^vue(\/|$)/, /^@opentiny\/vue(-|\/|$)/, /^@opentiny\/genui-sdk-/],
});

await bundle({
  name: 'react',
  entry: 'src/frameworks/react/factories.ts',
  plugins: [react()],
  external: [/^react(\/|$)/, /^react-dom(\/|$)/, /^@opentiny\/genui-sdk-/],
});
