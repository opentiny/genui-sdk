import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import path from 'path';
import packageJson from './package.json';
import jsconfigPaths from 'vite-jsconfig-paths';
import type { PluginOption } from 'vite';
import obfuscator from 'vite-plugin-bundle-obfuscator';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
  console.log(mode);

  const plugins = [
    dts({
      tsconfigPath: './tsconfig.json',
      rollupTypes: true,
    }),
    jsconfigPaths({
      projects: ['./tsconfig.json'],
    }) as PluginOption,
  ];

  if (mode === 'no-obfuscator') {
    plugins.push(
      visualizer({
        open: true,
      }),
    );
  } else {
    plugins.push(
      obfuscator({
        apply: 'build',
        threadPool: true,
        options: {
          compact: true,
          debugProtection: false,
          deadCodeInjection: true,
          deadCodeInjectionThreshold: 0.4,
          identifierNamesGenerator: 'hexadecimal',
          stringArray: true,
          stringArrayEncoding: ['base64'], // 进一步加密字符串
          splitStrings: true,
          transformObjectKeys: true,
        },
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
