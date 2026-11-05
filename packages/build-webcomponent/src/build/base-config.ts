import type { InlineConfig, Plugin } from 'vite';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

export interface AliasEntry {
  find: string | RegExp;
  replacement: string;
}

export interface BaseViteConfigOptions {
  root: string;
  /** lib 入口，必须是真实文件：物料的 import 需要现场生成时由调用方先落盘 */
  entry: string;
  outDir: string;
  /** 不含扩展名 */
  fileName: string;
  emptyOutDir: boolean;
  /** 提供物料相关虚拟模块的插件 */
  virtualModulesPlugin: Plugin;
  /** 额外插件，例如 Angular linker 或 .d.ts 产出 */
  plugins?: Plugin[];
  /** 框架编译插件：`vue()`、`react()`，Angular 为空 */
  frameworkPlugins?: Plugin[];
  /** 不读取调用方项目的 vite.config */
  standalone?: boolean;
  alias?: AliasEntry[];
  dedupe?: string[];
  minify?: boolean | 'esbuild' | 'terser';
  sourcemap?: boolean;
  target?: string;
  logLevel?: InlineConfig['logLevel'];
  chunkSizeWarningLimit?: number;
}

/** Config shared by all three frameworks; every difference comes in through options */
export function createBaseViteConfig(options: BaseViteConfigOptions): InlineConfig {
  const {
    root,
    entry,
    outDir,
    fileName,
    emptyOutDir,
    virtualModulesPlugin,
    plugins = [],
    frameworkPlugins = [],
    alias = [],
    dedupe = [],
  } = options;

  return {
    root,
    ...(options.standalone ? { configFile: false as const } : {}),
    ...(options.logLevel ? { logLevel: options.logLevel } : {}),
    // 产物被浏览器直接 <script type="module"> 加载，必须静态替换 process.env.NODE_ENV，
    // 否则依赖里的 `process.env.NODE_ENV` 守卫会抛 ReferenceError
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
    ...(alias.length || dedupe.length ? { resolve: { alias, dedupe } } : {}),
    plugins: [virtualModulesPlugin, ...plugins, ...frameworkPlugins, cssInjectedByJsPlugin()],
    build: {
      lib: {
        entry,
        formats: ['es'],
        fileName: () => `${fileName}.js`,
      },
      outDir,
      emptyOutDir,
      cssCodeSplit: false,
      minify: options.minify ?? 'esbuild',
      sourcemap: options.sourcemap ?? false,
      ...(options.target ? { target: options.target } : {}),
      chunkSizeWarningLimit: options.chunkSizeWarningLimit ?? 2000,
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
          format: 'es',
        },
      },
    },
  };
}
