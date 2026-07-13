import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import escapeStringRegexp from 'escape-string-regexp';
import packageJson from './package.json';

export default defineConfig({
  plugins: [
    react(),
    dts({
      rollupTypes: true,
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
    rollupOptions: {
      external: [
        ...Object.keys(packageJson.dependencies || {}).map(
          (name) => new RegExp(`^${escapeStringRegexp(name)}(/|$)`),
        ),
        ...Object.keys(packageJson.peerDependencies || {}).map(
          (name) => new RegExp(`^${escapeStringRegexp(name)}(/|$)`),
        ),
      ],
    },
  },
});
