import path from 'path';
import { defineConfig, PluginOption } from 'vite';
import obfuscator from 'vite-plugin-bundle-obfuscator';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import escapeStringRegexp from 'escape-string-regexp';
import dts from 'vite-plugin-dts';
import importPlugin from '@opentiny/vue-vite-import'
import vue from '@vitejs/plugin-vue';
import packageJson from './package.json';

export default defineConfig(({  mode }) => {
  return {
    root: path.resolve(__dirname, './'),
    plugins: [
      vue(),
      mode === 'no-obfuscator' ? null : obfuscator({
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
      dts({ rollupTypes: true }),
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
    build: {
      lib: {
        entry: path.resolve(__dirname, './src/index.ts'),
        formats: ['es'],
        fileName: `index`,
      },
      outDir: path.resolve(__dirname, './dist'),
      sourcemap: false,
      minify: 'terser',
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
