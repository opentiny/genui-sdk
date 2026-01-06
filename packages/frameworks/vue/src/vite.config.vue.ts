import path from 'path';
import { defineConfig } from 'vite';
import obfuscator from 'vite-plugin-bundle-obfuscator';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import escapeStringRegexp from 'escape-string-regexp';
import dts from 'vite-plugin-dts';
import vue from '@vitejs/plugin-vue';
import packageJson from './package.json';

export default defineConfig(({  mode }) => {
  return {
    root: path.resolve(__dirname, './genui-sdk/vue'),
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
      }),
      cssInjectedByJsPlugin(),
      // TODO: 这里需要优化，配置rollupTypes会报错，暂时使用非rollupTypes的dts插件
      // dts({ rollupTypes: true }),
      dts(),
    ],
    build: {
      lib: {
        entry: path.resolve(__dirname, './src/vue/index.ts'),
        formats: ['es'],
        fileName: `index`,
      },
      outDir: path.resolve(__dirname, './genui-sdk/vue/dist'),
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
