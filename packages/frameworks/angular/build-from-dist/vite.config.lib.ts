import path from 'path';
import { defineConfig, PluginOption } from 'vite';
// import { visualizer } from 'rollup-plugin-visualizer';
// import obfuscator from 'vite-plugin-bundle-obfuscator';
import escapeStringRegexp from 'escape-string-regexp';
import tsconfigPaths from 'vite-jsconfig-paths';
import dts from 'vite-plugin-dts';
import packageJson from '../package.json';
import { viteStaticCopy } from 'vite-plugin-static-copy';
export default defineConfig(({ mode }) => {
  return {
    root: path.resolve(__dirname, './'),
    plugins: [
      {
        name: 'fix-component-styles-replace-backtick-with-single-quote',
        apply: 'build',
        enforce: 'pre',
        // 组件的styles字段 在angular 开发阶段需要保持是字符串字面量数组，否则esbuild会报错
        generateBundle(_, bundle) {
          for (const [fileName, chunk] of Object.entries(bundle)) {
            if (chunk.type === 'chunk' && chunk.code) {
              chunk.code = chunk.code.replace(/styles: \[\`(.*?)\s\`\]/gs, "styles: ['$1']");
            }
          }
        },
      },
      // mode === 'no-obfuscator'
      //   ? visualizer({
      //     open: true
      //   })
      //   : obfuscator({
      //     apply: 'build',
      //     threadPool: true,
      //     options: {
      //       compact: true,
      //       debugProtection: false,
      //       deadCodeInjection: true,
      //       deadCodeInjectionThreshold: 0.4,
      //       identifierNamesGenerator: 'hexadecimal',
      //       stringArray: true,
      //       transformObjectKeys: true,
      //     },
      //   }) as PluginOption, // TODO: pluginOption types are not equal
      tsconfigPaths({
        projects: ['./tsconfig.json'],
      }) as PluginOption,
      dts({
        rollupTypes: true,
        tsconfigPath: path.resolve(__dirname, './tsconfig.json'),
        compilerOptions: {
          paths: {
            '../dist/renderer': ['../../dist/renderer/index.d.ts'] // hack for fix relative path for 'output/dist'
          },
        },
        bundledPackages: ['@opentiny/tiny-schema-renderer-ng'],
      }),
      viteStaticCopy({
        targets: [
          {
            src: '../dist/renderer/package.json',
            dest: '../',
            transform: (content) => {
              const newPackageJson = JSON.parse(content);
              newPackageJson.exports = {
                '.': {
                  ...newPackageJson.exports['.'],
                  'types': './dist/index.d.ts',
                  'default': './dist/index.mjs',
                },
              };
              newPackageJson.module = './dist/index.mjs';
              newPackageJson.typings = './dist/index.d.ts';
              newPackageJson.version = packageJson.version;
              return JSON.stringify(newPackageJson, null, 2);
            },
          },
        ],
      }),
    ],
    build: {
      lib: {
        entry: path.resolve(__dirname, './index.ts'),
        formats: ['es'],
        fileName: `index`,
      },
      outDir: path.resolve(__dirname, '../output/dist'),
      emptyOutDir: true,
      sourcemap: false,
      terserOptions: {
        mangle: {
          toplevel: true,
        },
        format: {
          comments: false
        },
      },
      rollupOptions: {
        external: [...Object.keys(packageJson.dependencies || {}).map(name => new RegExp(`^${escapeStringRegexp(name)}(/|$)`))],
      },
    },
  };
});
