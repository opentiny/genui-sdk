import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tsconfigPaths from 'vite-jsconfig-paths';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { viteGitCommitHashPlugin } from 'vite-commit-hash-plugin';

const VENDOR_CHUNKS = new Set([
  'opentiny-vue',
  'opentiny-genui-sdk-core',
  'opentiny-genui-sdk-vue',
  'opentiny-tiny-robot',
  'opentiny-tiny-robot-kit',
  'opentiny-tiny-robot-svgs',
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

export default defineConfig(({ command }) => {
  const plugins = [
    react({ include: /[/\\]src[/\\]react-demo[/\\]/ }),
    vue({
      exclude: [/[/\\]src[/\\]react-demo[/\\]/, /\.tsx$/, /\.jsx$/],
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag === 'tiny-schema-renderer-element-ng',
        },
      },
    }),
    viteGitCommitHashPlugin({ fileName: 'version.json' }),
  ];

  if (command === 'serve') {
    plugins.push(
      tsconfigPaths({ projects: ['./tsconfig.dev.json'] }),
      nodePolyfills(),
    );
  }

  return {
    envDir: './env',
    appType: 'mpa',
    plugins,
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      exclude: ['monaco-editor', 'monaco-editor-vue3', '@opentiny/genui-sdk-react'],
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          reactDemo: path.resolve(__dirname, 'react-demo.html'),
        },
        output: {
          manualChunks: createManualChunks(),
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
  };
});
