import path from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import vue from '@vitejs/plugin-vue';
import escapeStringRegexp from 'escape-string-regexp';
import packageJson from './package.json';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

const externalPackages = [
  ...Object.keys(packageJson.dependencies || {}),
  ...Object.keys(packageJson.peerDependencies || {}),
];

export default defineConfig({
  plugins: [
    vue(),
    dts({
      rollupTypes: true,
    }),
    cssInjectedByJsPlugin({
      jsAssetsFilterFunction: (chunk) => chunk.fileName === 'materials.js',
    }),
  ],
  build: {
    lib: {
      entry: {
        index: path.resolve(__dirname, './src/index.ts'),
        meta: path.resolve(__dirname, './src/meta/index.ts'),
        materials: path.resolve(__dirname, './src/materials/index.ts'),
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    sourcemap: true,
    rollupOptions: {
      external: (id) => {
        if (id === 'element-plus/theme-chalk/dark/css-vars.css') {
          return false;
        }
        return externalPackages.some((name) => new RegExp(`^${escapeStringRegexp(name)}(/|$)`).test(id));
      },
    },
  },
});
