import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

// 出码配置来自物料包的 code-generator 子出口。不指源码的话,它会按 node 解析走到该包的
// dist/code-generator.js —— 改 src/ 下的配置后本页(与 headless/out.cjs)都不生效,
// 必须先在物料包 vite build 一次。踩过这个坑:改了 derive-library-maps 却仍按旧 dist 跑,
// 结果误判成"改动没生效"。这里显式指向源码,和 playground 的 dev 解析保持一致。
const MATERIALS_CODEGEN_SRC = fileURLToPath(
  new URL('../../../../materials/angular-opentiny-ng/src/code-generator/index.ts', import.meta.url),
);

export default defineConfig({
  resolve: {
    alias: [
      // 只拦子出口,别把 '@opentiny/genui-sdk-materials-angular-opentiny-ng' 根入口也改掉:
      // 根入口走 dist 是既有的渲染侧行为,这里没必要动。
      {
        find: '@opentiny/genui-sdk-materials-angular-opentiny-ng/code-generator',
        replacement: MATERIALS_CODEGEN_SRC,
      },
    ],
  },
  server: {
    port: 5175,
    strictPort: true,
  },
});
