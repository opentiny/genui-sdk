import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import importPlugin from '@opentiny/vue-vite-import'
import viteImagemin from 'vite-plugin-imagemin'
import { vitePluginVideoCompress } from './vite-plugin-video-compress'
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
    viteImagemin({
      optipng: {
        optimizationLevel: 7,
      },
      pngquant: {
        quality: [0.8, 0.9],
        speed: 4,
      },
      svgo: {
        plugins: [
          {
            name: 'removeViewBox',
          },
          {
            name: 'removeEmptyAttrs',
            active: false,
          },
        ],
      },
      webp: {
        quality: 80,
      },
    }),
    vitePluginVideoCompress({
      quality: 28,
      codec: 'libx264',
    }),
  ],
  resolve: {
    alias: {
      '@': _resolve('src')
    }
  },
  build: {
    outDir: path.resolve(__dirname, './dist'),
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
        /^@vue\/*/,
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
