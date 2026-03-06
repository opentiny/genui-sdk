import path from 'path';
import { defineConfig, PluginOption } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';
import obfuscator from 'vite-plugin-bundle-obfuscator';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import escapeStringRegexp from 'escape-string-regexp';
import dts from 'vite-plugin-dts';
import vue from '@vitejs/plugin-vue';
import packageJson from './package.json';

export default defineConfig(({ mode }) => {
  return {
    root: path.resolve(__dirname, './'),
    plugins: [
      vue(),
      mode === 'no-obfuscator'
        ? visualizer({
          open: true
        })
        : obfuscator({
          apply: 'build',
          threadPool: true,
          options: {
            compact: true,
            debugProtection: false,
            deadCodeInjection: true,
            deadCodeInjectionThreshold: 0.4,
            identifierNamesGenerator: 'hexadecimal',
            stringArray: true,
            transformObjectKeys: true,
          },
        }) as PluginOption, // TODO: pluginOption types are not equal
      cssInjectedByJsPlugin(),
      dts({
        rollupTypes: true,
        bundledPackages: [
          '@opentiny/genui-sdk-core',
          '@opentiny/genui-sdk-materials-vue-opentiny-vue',
          '@opentiny/tiny-schema-renderer',
          'zod',
          'zod-to-json-schema',
        ],
        compilerOptions: {
          paths: {
            // 临时规避此包无.d.ts文件的问题
            '@opentiny/tiny-schema-renderer': ['../src/types/tiny-schema-renderer.d.ts'],
          },
          include: ['../src/types/tiny-schema-renderer.d.ts'],
        }
      }),
    ],
    build: {
      lib: {
        entry: path.resolve(__dirname, './src/index.ts'),
        formats: ['es'],
        fileName: `index`,
      },
      outDir: path.resolve(__dirname, './output/dist'),
      sourcemap: false,
      terserOptions: {
        mangle: {
          toplevel: true,
        },
        format: {
          comments: false,
        },
      },
      rollupOptions: {
        external: [...Object.keys(packageJson.dependencies || {}).map(name => new RegExp(`^${escapeStringRegexp(name)}(/|$)`))],
      },
    },
  };
});
