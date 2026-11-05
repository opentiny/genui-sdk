import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { transformAsync } from '@babel/core';
import { createEs2015LinkerPlugin } from '@angular/compiler-cli/linker/babel';
import type { InlineConfig, Plugin } from 'vite';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

export const GENUI_MATERIALS_VIRTUAL_ID = 'virtual:genui-materials';
const RESOLVED_MATERIALS_ID = '\0' + GENUI_MATERIALS_VIRTUAL_ID;

/**
 * 只认「调用」形式：`ɵɵngDeclareComponent({ ... })`。
 * `@angular/core` 自身也定义了 `function ɵɵngDeclareXxx(decl)`，那是 JIT 兼容垫片，不能当成分部声明。
 */
const PARTIAL_DECLARATION_CALL = /ɵɵngDeclare[A-Za-z]+\(\{/;

/** 用固定物料填充 `virtual:genui-materials`。CLI 换成按路径映射的插件，其余配置两者共用 */
export function createMaterialsPlugin(materialsEntry: string, materialKey: string): Plugin {
  return {
    name: 'genui-web-component-materials',
    resolveId(id) {
      return id === GENUI_MATERIALS_VIRTUAL_ID ? RESOLVED_MATERIALS_ID : null;
    },
    load(id) {
      if (id !== RESOLVED_MATERIALS_ID) return null;
      return [
        `import { materials as __genuiMaterials } from ${JSON.stringify(materialsEntry)};`,
        'export const materials = __genuiMaterials;',
        `export const materialKey = ${JSON.stringify(materialKey)};`,
      ].join('\n');
    },
  };
}

/** linker 只用到极少几个文件系统能力，这里用 node:fs 直接实现 */
const linkerFileSystem = {
  resolve: (...segments: string[]) => path.resolve(...segments),
  exists: (fileName: string) => existsSync(fileName),
  readFile: (fileName: string) => readFileSync(fileName, 'utf-8'),
  dirname: (fileName: string) => path.dirname(fileName),
  relative: (from: string, to: string) => path.relative(from, to),
  normalize: (fileName: string) => path.normalize(fileName),
  isRoot: (fileName: string) => path.dirname(fileName) === fileName,
};

const linkerLogger = {
  level: 1,
  debug: (...args: unknown[]) => console.debug('[angular-linker]', ...args),
  info: (...args: unknown[]) => console.info('[angular-linker]', ...args),
  warn: (...args: unknown[]) => console.warn('[angular-linker]', ...args),
  error: (...args: unknown[]) => console.error('[angular-linker]', ...args),
};

/**
 * Angular 的第三方库（`@opentiny/ng-*`、`@opentiny/ng`）都是 partial-Ivy 产物，
 * 里面是 `ɵɵngDeclareComponent` 这类声明，必须经过 Angular linker 才能变成运行时可直接执行的
 * `ɵɵdefineComponent`。Angular CLI 的应用构建会自动做这件事，但我们这条 Vite 链路必须自己挂上，
 * 否则产物在浏览器里会直接报 `ɵɵngDeclareComponent is not a function`。
 */
export function createAngularLinkerPlugin(): Plugin {
  return {
    name: 'genui-angular-linker',
    enforce: 'pre',
    async transform(code, id) {
      // @angular/compiler 只有定义没有调用，跳过可以省掉一次超大文件的解析
      if (!PARTIAL_DECLARATION_CALL.test(code) || id.includes('/@angular/compiler/')) return null;

      const result = await transformAsync(code, {
        filename: id,
        sourceMaps: true,
        sourceFileName: id,
        babelrc: false,
        configFile: false,
        browserslistConfigFile: false,
        compact: false,
        sourceType: 'module',
        plugins: [createEs2015LinkerPlugin({ fileSystem: linkerFileSystem, logger: linkerLogger })],
      });

      if (!result?.code) return null;
      if (process.env.GENUI_LINKER_DEBUG) console.log('[linker] linked', id);
      return { code: result.code, map: result.map as never };
    },
  };
}

export interface WebComponentBuildConfigOptions {
  root: string;
  /** lib 入口，必须是真实文件：物料的 import 需要现场生成时由调用方先落盘 */
  entry: string;
  outDir: string;
  /** 不含扩展名 */
  fileName: string;
  emptyOutDir: boolean;
  /** 提供物料相关虚拟模块的插件 */
  virtualModulesPlugin: Plugin;
  /** 额外插件，例如 .d.ts 产出 */
  plugins?: Plugin[];
  /** 不读取调用方项目的 vite.config */
  standalone?: boolean;
  /** 需要去重的包：Angular 运行时与物料必须共用一份 */
  dedupe?: string[];
  /** 额外别名，例如把 `@opentiny/genui-sdk-angular/web-component-factory` 指到本仓库产物 */
  alias?: Array<{ find: string | RegExp; replacement: string }>;
  minify?: boolean | 'esbuild' | 'terser';
  sourcemap?: boolean;
  target?: string;
  logLevel?: InlineConfig['logLevel'];
  chunkSizeWarningLimit?: number;
}

const DEFAULT_DEDUPE = ['@angular/core', '@angular/common', 'rxjs', 'zone.js', '@opentiny/ng'];

/** 两条链路共用的 Vite 配置，差异全部通过 options 传入 */
export function createWebComponentViteConfig(options: WebComponentBuildConfigOptions): InlineConfig {
  const {
    root,
    entry,
    outDir,
    fileName,
    emptyOutDir,
    virtualModulesPlugin,
    plugins = [],
    dedupe = DEFAULT_DEDUPE,
    alias = [],
  } = options;

  return {
    root,
    ...(options.standalone ? { configFile: false as const } : {}),
    ...(options.logLevel ? { logLevel: options.logLevel } : {}),
    // 产物被浏览器直接 <script type="module"> 加载，必须静态替换 process.env.NODE_ENV，
    // 否则 Angular / zone.js 里的 `process.env.NODE_ENV` 守卫会抛 ReferenceError
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
    resolve: {
      alias,
      dedupe,
    },
    plugins: [virtualModulesPlugin, ...plugins, createAngularLinkerPlugin(), cssInjectedByJsPlugin()],
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
      chunkSizeWarningLimit: options.chunkSizeWarningLimit ?? 4000,
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
          format: 'es',
        },
      },
    },
  };
}
