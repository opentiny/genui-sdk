import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// 关键：把 SDK 指到**源码**而不是 dist。
// packages/frameworks/vue 与 packages/core 的非流式改动尚未提交，dist 是旧的；
// 指向 src 后改完源码刷新页面就能看到效果，不用先 build。
// 子路径（/materials、/meta）必须排在裸包名前面，裸名用 ^...$ 收口，
// 否则会把将来的 `@opentiny/genui-sdk-vue/chat` 这类子路径一起吞掉。
const sdkAliases = [
  {
    find: '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials',
    replacement: r('../../packages/materials/vue-opentiny-vue/src/materials/index.ts'),
  },
  {
    find: '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta',
    replacement: r('../../packages/materials/vue-opentiny-vue/src/meta/index.ts'),
  },
  {
    find: /^@opentiny\/genui-sdk-materials-vue-opentiny-vue$/,
    replacement: r('../../packages/materials/vue-opentiny-vue/src/index.ts'),
  },
  {
    find: /^@opentiny\/genui-sdk-vue$/,
    replacement: r('../../packages/frameworks/vue/src/index.ts'),
  },
  {
    find: /^@opentiny\/genui-sdk-core$/,
    replacement: r('../../packages/core/src/index.ts'),
  },
];

export default defineConfig({
  plugins: [
    vue(),
    // GenuiChat 本身不需要 polyfill，但引到源码后有依赖可能裸用 process/Buffer，留着当保险
    nodePolyfills(),
  ],
  resolve: {
    // materials / vue 包各自 link 了一份 vue，不去重会出现两个 Vue 实例
    dedupe: ['vue'],
    alias: sdkAliases,
  },
  server: {
    // alias 的目标在应用目录之外，需要放行仓库根，否则 Vite 拒绝 serve
    fs: { allow: [r('../..')] },
  },
});
