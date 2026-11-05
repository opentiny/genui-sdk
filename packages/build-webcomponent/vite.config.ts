import path from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import packageJson from './package.json';

const escapeRe = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * 把 CLI 打成一个 Node 脚本（`dist/bin.mjs`）。
 * 构建期依赖（vite / 各框架插件 / babel / Angular linker）保持 external，运行时从使用方项目里解析。
 */
const EXTERNALS = [
  'vite',
  'vite-plugin-css-injected-by-js',
  '@vitejs/plugin-vue',
  '@vitejs/plugin-react',
  '@vue/compiler-sfc',
  '@babel/core',
  '@angular/compiler-cli',
  ...Object.keys(packageJson.dependencies || {}),
  ...Object.keys(packageJson.peerDependencies || {}),
].map((name) => new RegExp(`^${escapeRe(name)}(/|$)`));

export default defineConfig({
  plugins: [
    dts({
      entryRoot: 'src',
      outDir: 'dist',
      include: ['src/**/*.ts'],
      // src/frameworks 是给使用方现场编译的运行时源码，不参与类型产出
      exclude: ['src/frameworks/**', '**/bin.ts'],
      tsconfigPath: path.resolve(__dirname, './tsconfig.json'),
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: {
        bin: path.resolve(__dirname, './src/bin.ts'),
        index: path.resolve(__dirname, './src/index.ts'),
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.mjs`,
    },
    outDir: path.resolve(__dirname, './dist'),
    emptyOutDir: false,
    sourcemap: true,
    rollupOptions: {
      external: [/^node:/, ...EXTERNALS],
    },
  },
});
