import type { InlineConfig, Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

export const GENUI_MATERIALS_VIRTUAL_ID = 'virtual:genui-materials';
const RESOLVED_MATERIALS_ID = '\0' + GENUI_MATERIALS_VIRTUAL_ID;

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
  /** 把 vue 强制解析到该目录并去重，保证产物里只有一份 Vue */
  vueDir?: string;
  /** 把模板里的标签强制按原生元素编译。物料侧可能真的要用自定义元素，所以默认关闭 */
  nativeElementsOnly?: boolean;
  minify?: boolean | 'esbuild' | 'terser';
  sourcemap?: boolean;
  target?: string;
  logLevel?: InlineConfig['logLevel'];
  chunkSizeWarningLimit?: number;
}

/** 两条链路共用的 Vite 配置，差异全部通过 options 传入 */
export function createWebComponentViteConfig(options: WebComponentBuildConfigOptions): InlineConfig {
  const { root, entry, outDir, fileName, emptyOutDir, virtualModulesPlugin, plugins = [], vueDir } = options;

  return {
    root,
    ...(options.standalone ? { configFile: false as const } : {}),
    ...(options.logLevel ? { logLevel: options.logLevel } : {}),
    // 产物被浏览器直接 <script type="module"> 加载，必须静态替换 process.env.NODE_ENV，
    // 否则 Vue 等依赖里的 `process.env.NODE_ENV` 守卫会抛 ReferenceError: process is not defined
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
    ...(vueDir ? { resolve: { alias: [{ find: /^vue$/, replacement: vueDir }], dedupe: ['vue'] } } : {}),
    plugins: [
      virtualModulesPlugin,
      ...plugins,
      options.nativeElementsOnly ? vue({ template: { compilerOptions: { isCustomElement: () => false } } }) : vue(),
      cssInjectedByJsPlugin(),
    ],
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
