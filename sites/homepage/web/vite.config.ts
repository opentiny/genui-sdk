import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import importPlugin from '@opentiny/vue-vite-import'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import path from 'path'

function _resolve(dir) {
  return path.resolve(__dirname, dir)
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    viteStaticCopy({
      targets: [
        {
          src: 'src/static/**/*',
          dest: 'static'
        }
      ]
    }),
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
