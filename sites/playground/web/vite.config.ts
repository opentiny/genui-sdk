import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tsconfigPaths from 'vite-jsconfig-paths';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { viteGitCommitHashPlugin } from 'vite-commit-hash-plugin';

/** 单独拆包的依赖（chunk 名），其余 node_modules 进 vendor；@opentiny/vue* 统一为 opentiny-vue */
const VENDOR_CHUNKS = new Set([
  'vue',
  'opentiny-vue',
  'opentiny-genui-sdk-core',
  'opentiny-genui-sdk-vue',
  'opentiny-tiny-robot',
  'opentiny-tiny-robot-kit',
  'opentiny-tiny-robot-svgs',
  'gridstack',
]);

function createManualChunks() {
  const pnpmRe = /[\\/]node_modules[\\/]\.pnpm[\\/][^\\/]+[\\/]node_modules[\\/](@[^\\/]+[\\/][^\\/]+|[^\\/]+)/;
  const nmRe = /[\\/]node_modules[\\/](@[^\\/]+[\\/][^\\/]+|[^\\/]+)/;

  return (id: string): string | undefined => {
    if (!id.includes('node_modules')) return undefined;
    const pkg = id.match(pnpmRe)?.[1] ?? id.match(nmRe)?.[1];
    if (!pkg || pkg === '.pnpm') return 'vendor';
    const name = pkg.startsWith('@') ? pkg.slice(1).replace('/', '-') : pkg;
    if (name === 'opentiny-vue' || name.startsWith('opentiny-vue-')) return 'opentiny-vue';
    return VENDOR_CHUNKS.has(name) ? name : 'vendor';
  };
}

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const plugins = [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag === 'tiny-schema-renderer-element-ng',
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
