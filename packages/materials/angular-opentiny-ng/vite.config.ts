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
        meta: path.resolve(__dirname, './src/meta/index.ts'),
        materials: path.resolve(__dirname, './src/materials/index.ts'),
        // 出码配置出口,独立成 entry 而不并入 index:它会副作用加载 @angular/compiler,
        // 不该让渲染器侧的运行时依赖背上 JIT 编译器(见 src/code-generator/index.ts)
        'code-generator': path.resolve(__dirname, './src/code-generator/index.ts'),
      },
      formats: ['es'],
      fileName: (format, entryName) => `${entryName}.js`,
    },
    sourcemap: true,
    rollupOptions: {
      external: [...Object.keys(packageJson.dependencies || {}).map(name => new RegExp(`^${escapeStringRegexp(name)}(/|$)`))],
    },
  },
});
