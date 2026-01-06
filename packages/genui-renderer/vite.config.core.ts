import path from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import escapeStringRegexp from 'escape-string-regexp';
import packageJson from './genui-sdk/core/package.json';

export default defineConfig({
  root: path.resolve(__dirname, './genui-sdk/core'),
  resolve: {
    extensions: ['.ts', '.js'],
  },
  plugins: [
    dts({
      rollupTypes: true,
    }),
  ],
  build: {
    lib: {
      entry: path.resolve(__dirname, './src/core/index.ts'),
      formats: ['es'],
      fileName: `index`,
    },
    outDir: path.resolve(__dirname, './genui-sdk/core/dist'),
    rollupOptions: {
      external: [...Object.keys(packageJson.dependencies || {}).map(name => new RegExp(`^${escapeStringRegexp(name)}(/|$)`))],
    },
  },
});
