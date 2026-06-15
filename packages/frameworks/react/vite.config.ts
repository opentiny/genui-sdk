import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import escapeStringRegexp from 'escape-string-regexp';
import packageJson from './package.json';

export default defineConfig({
  plugins: [
    react(),
    dts({ rollupTypes: true, bundledPackages: ['@opentiny/genui-sdk-core'] }),
  ],
  build: {
    lib: {
      entry: {
        index: path.resolve(__dirname, './src/index.ts'),
        renderer: path.resolve(__dirname, './src/renderer/index.ts'),
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
        ...Object.keys(packageJson.dependencies || {}).map(
          (name) => new RegExp(`^${escapeStringRegexp(name)}(/|$)`),
        ),
      ],
    },
  },
});
