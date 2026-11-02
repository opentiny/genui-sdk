import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const srcAlias = path.resolve(__dirname, './src');

export default defineConfig({
  root: path.resolve(__dirname, './test'),
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@opentiny/tiny-schema-renderer-react': srcAlias,
    },
  },
  server: {
    open: true,
  },
});
