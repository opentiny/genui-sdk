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
    // 将 src/static 下的内容拷贝到打包产物的 dist/static 目录（包括所有子目录）
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
          libraryName: '@opentiny/vue'
        },
        {
          libraryName: `@opentiny/vue-icon`,
          customName: (name) => {
            return `@opentiny/vue-icon/lib/${name.replace(/^icon-/, '')}.js`
          }
        }
      ],
      'pc' // 此配置非必选，按需配置(pc|mobile|mobile-first)
    ),
  ],
  resolve: {
    alias: {
      '@': _resolve('src'),
      '@/components': _resolve('src/components'),
      '@/assets': _resolve('src/assets')
    }
  },
  build: {
    // 打包产物输出目录
    outDir: 'dist',
    emptyOutDir: true,
    // 完全禁用 sourcemap，避免生成 .js.map 文件
    sourcemap: true,
    // 以库模式构建，将首页打成一个可直接 import 的组件（包含样式注入）
    lib: {
      entry: _resolve('src/views/home.vue'),
      name: 'GenuiSdkHome',
      fileName: 'index',
      formats: ['es']
    },
    // 不拆分 CSS，样式会在组件 JS 中自动注入，无需宿主额外 import
    cssCodeSplit: false,
    rollupOptions: {
      // 将 Vue 和相关依赖外部化，避免打包进库中导致多个 Vue 实例的问题
      external: [
        'vue',
        'vue-router',
        /^@opentiny\/vue.*/,
        /^@opentiny\/genui-sdk-vue.*/
      ],
      output: {
        // 为外部化的依赖提供全局变量名（如果需要 UMD 格式）
        globals: {
          vue: 'Vue',
          'vue-router': 'VueRouter'
        },
        // 在 JS 文件开头自动导入 CSS，确保样式生效
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
