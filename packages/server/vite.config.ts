import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import path from 'path';
import packageJson from './package.json';
import jsconfigPaths from 'vite-jsconfig-paths';
import type { PluginOption } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
  const plugins = [
    dts({
      rollupTypes: true,
      bundledPackages: ['@opentiny/genui-sdk-core', '@opentiny/genui-sdk-chat-completions'],
    }),
    jsconfigPaths({
      projects: ['./tsconfig.json'],
    }) as PluginOption,
  ];

  if (mode === 'analyze') {
    plugins.push(
      visualizer({
        open: true,
      }),
    );
  }

  return {
    plugins,

    build: {
      lib: {
        entry: {
          index: path.resolve(__dirname, 'src/index.ts'),
          cli: path.resolve(__dirname, 'src/cli.ts'),
        },
        formats: ['es'],
      },
      outDir: 'output/dist',
      sourcemap: mode === 'no-obfuscator',
      rollupOptions: {
        external: (id) => {
          if (id.includes('@opentiny/genui-sdk-core')) {
            return false;
          }
          if (id.startsWith('node:')) {
            return true;
          }
          const deps = Object.keys(packageJson.dependencies || {});
          return deps.some((dep) => id === dep || id.startsWith(`${dep}/`));
        },
        output: {
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === 'index') return 'index.js';
            if (chunkInfo.name === 'cli') return 'cli.js';
            return '[name].js';
          },
        },
      },
    },
  };
});
