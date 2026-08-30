import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tsconfigPaths from 'vite-jsconfig-paths';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { viteGitCommitHashPlugin } from 'vite-commit-hash-plugin';

// Angular 出码器源码(无 npm 产物,直接引用 workspace 源码):
// 导出按钮在前端调用它的 generateCode,需要在 dev(tsconfigPaths 解析 paths)与
// 生产 build(resolve.alias)两条链路下都能命中。
const ANGULAR_CODE_GENERATOR_ALIAS = fileURLToPath(
  new URL('../../../packages/frameworks/angular/projects/code-generator/index.ts', import.meta.url),
);

/** 单独拆包的依赖（chunk 名），其余 node_modules 进 vendor；@opentiny/vue* 统一为 opentiny-vue */
const VENDOR_CHUNKS = new Set([
  'opentiny-vue',
  'opentiny-genui-sdk-core',
  'opentiny-genui-sdk-vue',
  'opentiny-tiny-robot',
  'opentiny-tiny-robot-kit',
  'opentiny-tiny-robot-svgs'
]);

function createManualChunks() {
  const separator = '[\\/]';
  const pkg = `(@[^\\/]+${separator}[^\\/]+|[^\\/]+)`;
  const pnpmRegex = new RegExp(`.*node_modules${separator}${pkg}`);

  return (id: string): string | undefined => {
    if (!id.includes('node_modules')) return undefined;

    const pkgName = id.match(pnpmRegex)?.[1];
    if (!pkgName) return 'vendor';

    const name = pkgName.startsWith('@') ? pkgName.slice(1).replace('/', '-') : pkgName;
    if (/^opentiny-vue(-|$)/.test(name)) return 'opentiny-vue';
    return VENDOR_CHUNKS.has(name) ? name : 'vendor';
  };
}

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const plugins = [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag === 'genui-renderer-ng-element',
        },
      },
    }),
    viteGitCommitHashPlugin({
      fileName: 'version.json',
    }),
  ];

  if (command === 'serve') {
    plugins.push(
      tsconfigPaths({
        projects: ['./tsconfig.dev.json'],
      }),
      nodePolyfills(), // tiny-schema-renderer 依赖 babel 间接依赖 process.env等内容
    );
  }

  return {
    envDir: './env',
    plugins,
    resolve: {
      alias: {
        '@opentiny/genui-angular-code-generator': ANGULAR_CODE_GENERATOR_ALIAS,
      },
    },
    optimizeDeps: {
      exclude: ['monaco-editor', 'monaco-editor-vue3'],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: createManualChunks(),
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
  };
});
