import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import escapeStringRegexp from 'escape-string-regexp';
import packageJson from './package.json';

const srcAlias = path.resolve(__dirname, './src');

export default defineConfig(({ command }) => {
  if (command === 'serve') {
    return {
      root: path.resolve(__dirname, './test'),
      plugins: [react()],
      resolve: {
        dedupe: ['react', 'react-dom'],
        alias: {
          '@opentiny/tiny-schema-renderer-react': srcAlias,
        },
      },
      server: {
        open: true,
      },
    };
  }

  return {
    plugins: [
      react(),
      dts({
        rollupTypes: true,
        include: ['src'],
      }),
    ],
    build: {
      lib: {
        entry: {
          index: path.resolve(__dirname, './src/index.ts'),
        },
        formats: ['es'],
        fileName: (_, entryName) => `${entryName}.js`,
      },
      outDir: path.resolve(__dirname, './dist'),
      rollupOptions: {
        external: [
          'react',
          'react-dom',
          'react/jsx-runtime',
          ...Object.keys(packageJson.dependencies || {}).map((name) => new RegExp(`^${escapeStringRegexp(name)}(/|$)`)),
        ],
      },
    },
  };
});
