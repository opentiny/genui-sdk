import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [
        'vue',
        'react',
        'react-dom',
        '@opentiny/genui-sdk-react',
      ],
      onwarn(warning, warn) {
        // antd 各组件带 "use client"，库模式打包时 Rollup 会忽略该指令并告警
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        warn(warning);
      },
    },
  },
});
