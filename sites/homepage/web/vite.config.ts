import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import importPlugin from '@opentiny/vue-vite-import'
import path from 'path'

function _resolve(dir: string) {
  return path.resolve(__dirname, dir)
}

export default defineConfig({
  plugins: [
    vue(),
    importPlugin(
      [
        {
          libraryName: '@opentiny/vue',
          customName: (name) => `@opentiny/vue-${name}`
        },
        {
          libraryName: `@opentiny/vue-icon`,
          customName: (name) => `@opentiny/vue-icon/lib/${name.replace(/^icon-/, '')}.js`
        }
      ],
      'pc'
    ),
  ],
  resolve: {
    alias: {
      '@': _resolve('src')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    assetsInlineLimit: 0,
    lib: {
      entry: _resolve('src/views/home.vue'),
      name: 'GenuiSdkHome',
      fileName: 'index',
      formats: ['es']
    },
    cssCodeSplit: false,
    rollupOptions: {
      external: [
        'vue',
        'vue-router',
        /^@opentiny\/vue.*/,
        /^@opentiny\/genui-sdk-vue.*/
      ],
      output: {
        entryFileNames: 'index.js',
        chunkFileNames: 'assets/js/[name]-[hash].js',
        manualChunks: (id) => {
          if (id.includes('/src/components/')) {
            const match = id.match(/\/src\/components\/([^/]+)/);
            if (match) {
              const componentName = match[1];
              return `component-${componentName.toLowerCase()}`;
            }
          }
          if (id.includes('highlight.js')) {
            return 'vendor-highlight';
          }
          if (id.includes('/src/utils/') || id.includes('/src/config/')) {
            return 'utils-config';
          }
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'index.css'
          }
          return 'assets/[ext]/[name]-[hash].[ext]';
        },
        banner: (chunk) => {
          if (chunk.name === 'index') {
            return 'import "./index.css";'
          }
          return ''
        }
      }
    }
  }
})
