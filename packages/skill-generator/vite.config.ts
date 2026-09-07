import path from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import escapeStringRegexp from 'escape-string-regexp';
import packageJson from './package.json';

export default defineConfig({
  root: path.resolve(__dirname, './'),
  resolve: {
    extensions: ['.ts', '.js'],
  },
  plugins: [
    dts({
      rollupTypes: true,
      exclude: ['src/__tests__/**'],
    }),
  ],
  build: {
    lib: {
      entry: {
        index: path.resolve(__dirname, './src/index.ts'),
        cli: path.resolve(__dirname, './src/bin.ts'),
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    outDir: path.resolve(__dirname, './dist'),
    rollupOptions: {
      external: [
        ...Object.keys(packageJson.dependencies || {}).map(
          (name) => new RegExp(`^${escapeStringRegexp(name)}(/|$)`),
        ),
        /^node:/,
      ],
    },
  },
});
