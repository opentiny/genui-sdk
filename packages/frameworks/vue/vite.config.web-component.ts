import path from 'path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { visualizer } from 'rollup-plugin-visualizer';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

export default defineConfig({
  root: path.resolve(__dirname, './'),
  plugins: [
    visualizer({ open: true }),
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
      fileName: 'genui-renderer',
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
    chunkSizeWarningLimit: 2000,
  },
});
