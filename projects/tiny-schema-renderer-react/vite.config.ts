import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import escapeStringRegexp from 'escape-string-regexp';
import packageJson from './package.json';

const srcAlias = path.resolve(__dirname, './src');
const repoRoot = path.resolve(__dirname, '../..');

export default defineConfig(({ command }) => {
  if (command === 'serve') {
    return {
      root: path.resolve(__dirname, './test'),
      plugins: [react()],
      resolve: {
        dedupe: ['react', 'react-dom'],
        alias: {
          '@opentiny/tiny-schema-renderer-react': srcAlias,
          '@opentiny/genui-sdk-react': path.resolve(repoRoot, 'packages/frameworks/react/src/index.ts'),
          '@opentiny/genui-sdk-materials-react-antd/components': path.resolve(
            repoRoot,
            'packages/materials/react-antd/src/components/index.ts',
          ),
          '@opentiny/genui-sdk-materials-react-antd': path.resolve(
            repoRoot,
            'packages/materials/react-antd/src/index.ts',
          ),
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
        bundledPackages: ['@opentiny/genui-sdk-core'],
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
          ...Object.keys(packageJson.dependencies || {}).map(
            (name) => new RegExp(`^${escapeStringRegexp(name)}(/|$)`),
          ),
        ],
      },
    },
  };
});
