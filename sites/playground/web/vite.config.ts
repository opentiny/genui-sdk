import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
// @ts-ignore
import tsconfigPaths from 'vite-jsconfig-paths';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { viteGitCommitHashPlugin } from 'vite-commit-hash-plugin';

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
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
  };
});
