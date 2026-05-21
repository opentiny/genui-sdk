import path from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import escapeStringRegexp from 'escape-string-regexp';
import { visualizer } from 'rollup-plugin-visualizer';
import packageJson from './package.json';

export default defineConfig(({ mode }) => {
  return {
    root: path.resolve(__dirname, './'),
    resolve: {
      extensions: ['.ts', '.js'],
    },
    plugins: [
      dts({
        rollupTypes: true,
      }),
      mode === 'analyze'
        ? visualizer({
            open: true,
          })
        : null,
    ],
    build: {
      lib: {
        entry: path.resolve(__dirname, './src/index.ts'),
        formats: ['es'],
        fileName: `index`,
      },
      outDir: path.resolve(__dirname, './dist'),
      rollupOptions: {
        external: [...Object.keys(packageJson.dependencies || {}).map(name => new RegExp(`^${escapeStringRegexp(name)}(/|$)`))],
      },
    },
  }
});
