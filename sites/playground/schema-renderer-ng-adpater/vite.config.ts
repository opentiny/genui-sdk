import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import vue from '@vitejs/plugin-vue';
import escapeStringRegexp from 'escape-string-regexp';
import packageJson from './package.json';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

export default defineConfig({
  build: {
    lib: {
      entry: './src/index.ts',
      formats: ['es'],
      name: 'ui-components',
      fileName: 'index',
    },
    sourcemap: true,
    rollupOptions: {
      external: [...Object.keys(packageJson.dependencies || {}).map(name => new RegExp(`^${escapeStringRegexp(name)}(/|$)`))],
    },
  },
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag === 'tiny-schema-renderer-element-ng',
        },
      },
    }),
    cssInjectedByJsPlugin(),
    dts({
      tsconfigPath: './tsconfig.json',
      rollupTypes: true,
    }),
  ],
});
