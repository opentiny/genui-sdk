import path from 'path';
import { defineConfig } from 'vite';
import escapeStringRegexp from 'escape-string-regexp';
import dts from 'vite-plugin-dts';
import packageJson from '../package.json';

export default defineConfig({
  root: path.resolve(__dirname, './'),
  plugins: [
    dts({
      rollupTypes: true,
      entryRoot: path.resolve(__dirname, './'),
      tsconfigPath: path.resolve(__dirname, './tsconfig.json'),
      include: [
        './index.ts',
        './materials.ts',
        './meta.ts',
        './patch.ts',
        '../projects/mat-materials/src/meta/index.ts',
      ],
      compilerOptions: {
        paths: {
          '../dist-ng': ['../dist-ng/index.d.ts'],
        },
      },
    }),
  ],
  build: {
    lib: {
      entry: {
        index: path.resolve(__dirname, './index.ts'),
        // meta 是纯数据（bundle.json + examples），不经过 ng-packagr，
        // 由外层 vite 直接从源码打包
        meta: path.resolve(__dirname, './meta.ts'),
        materials: path.resolve(__dirname, './materials.ts'),
        patch: path.resolve(__dirname, './patch.ts'),
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    outDir: path.resolve(__dirname, '../dist'),
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      external: [
        ...Object.keys(packageJson.dependencies || {}).map(name => new RegExp(`^${escapeStringRegexp(name)}(/|$)`)),
      ],
    },
  },
});
