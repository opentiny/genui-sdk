import path from 'path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

export default defineConfig({
  root: path.resolve(__dirname, './'),
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: () => false,
        },
      },
    }),
    cssInjectedByJsPlugin(),
  ],
  build: {
    lib: {
      entry: path.resolve(__dirname, './src/web-component/index.ts'),
      formats: ['es'],
      fileName: 'web-component',
    },
    outDir: path.resolve(__dirname, './output/web-component'),
    sourcemap: false,
    // Web Component 需要将所有依赖打包进去
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        format: 'es',
      },
    },
    // 增加 chunk 大小限制，因为需要打包所有依赖
    chunkSizeWarningLimit: 2000,
  },
});
