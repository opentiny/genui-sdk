import path from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import vue from '@vitejs/plugin-vue';
import escapeStringRegexp from 'escape-string-regexp';
import packageJson from './package.json';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

export default defineConfig({
  plugins: [
    vue(),
    dts({
      rollupTypes: true,
    }),
    cssInjectedByJsPlugin(),
  ],
  build: {
    lib: {
      entry: {
        index: path.resolve(__dirname, './src/index.ts'),
        meta: path.resolve(__dirname, './src/meta/index.ts'),
        materials: path.resolve(__dirname, './src/materials/index.ts'),
      },
      formats: ['es'],
      fileName: (format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: [
        ...Object.keys(packageJson.dependencies || {}).map((name) => new RegExp(`^${escapeStringRegexp(name)}(/|$)`)),
      ],
    },
  },
});
