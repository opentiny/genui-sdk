import path from 'path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const repoRoot = path.resolve(__dirname, '../../..');

export default defineConfig({
  root: path.resolve(__dirname, './test'),
  plugins: [vue()],
  resolve: {
    alias: {
      '@opentiny/tiny-schema-renderer': path.resolve(repoRoot, 'projects/tiny-schema-renderer/index.js'),
    },
  },
  server: {
    open: true,
  },
});
