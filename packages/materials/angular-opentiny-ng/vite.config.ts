import path from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import escapeStringRegexp from 'escape-string-regexp';
import packageJson from './package.json';

export default defineConfig({
  plugins: [
    dts({
      rollupTypes: true,
    }),
  ],
  build: {
    lib: {
      entry: {
        index: path.resolve(__dirname, './src/index.ts'),
        'render-config': path.resolve(__dirname, './src/render-config/index.ts'),
      },
      formats: ['es'],
      fileName: (format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: [...Object.keys(packageJson.dependencies || {}).map(name => new RegExp(`^${escapeStringRegexp(name)}(/|$)`))],
    },
  },
});
