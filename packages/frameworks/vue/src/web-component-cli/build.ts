import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, normalizePath, type InlineConfig, type Plugin } from 'vite';
import { resolvePackageDir, resolvePackageMainEntry, type ResolvedMaterialsSource } from './resolve-materials';
import { createWebComponentViteConfig } from '../web-component/build-config';
import { createWebComponentDts } from '../web-component/dts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** 兼容从 dist/ 和源码目录两种位置运行 */
function findPackageRoot(start: string): string {
  let dir = start;
  for (;;) {
    if (existsSync(path.join(dir, 'package.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(`无法定位 @opentiny/genui-sdk-vue 包根目录（起始于 ${start}）`);
    }
    dir = parent;
  }
}

const PACKAGE_ROOT = findPackageRoot(__dirname);

const FACTORY_ID = 'virtual:genui-web-component-factory';
const CORE_ID = 'virtual:genui-web-component-core';
const MATERIAL_ID_PREFIX = 'virtual:genui-web-component-material:';

export interface BuildWebComponentOptions {
  materials: ResolvedMaterialsSource[];
  tagName: string;
  /** 绝对路径 */
  outDir: string;
  /** 不含扩展名 */
  fileName: string;
  /** 默认 true */
  minify?: boolean;
  /** 默认 false */
  sourcemap?: boolean;
  /** 默认 info */
  logLevel?: 'info' | 'warn' | 'error' | 'silent';
}

export interface BuildWebComponentResult {
  outDir: string;
  fileName: string;
  files: string[];
  materials: ResolvedMaterialsSource[];
}

/** 工厂和 core 都取自本包已构建的 dist，避免与使用方的目录结构耦合 */
function resolveRuntimeEntries() {
  const factory = path.join(PACKAGE_ROOT, 'dist/web-component-factory.js');
  if (!existsSync(factory)) {
    throw new Error(
      `未找到 ${path.relative(PACKAGE_ROOT, factory)}，当前安装的 @opentiny/genui-sdk-vue 可能不包含 Web Component 构建能力，请升级到最新版本。`,
    );
  }

  return {
    factory,
    core: resolvePackageMainEntry('@opentiny/genui-sdk-core', PACKAGE_ROOT),
    vueDir: resolvePackageDir('vue', PACKAGE_ROOT),
  };
}

const toLiteral = (value: string) => JSON.stringify(value);

function createEntryCode(options: BuildWebComponentOptions): string {
  const { materials, tagName } = options;
  const imports = materials.map(
    (material, index) => `import { materials as __material${index} } from '${MATERIAL_ID_PREFIX}${index}';`,
  );
  const mergedList = materials.map((_, index) => `__material${index}`).join(', ');
  const materialKey = materials.map((material) => material.input).join('+');

  return [
    `import { createGenuiConfigRendererElement, defineGenuiConfigRenderer, GENUI_CONFIG_RENDERER_TAG } from '${FACTORY_ID}';`,
    ...imports,
    `import { mergeMaterials as __mergeMaterials } from '${CORE_ID}';`,
    '',
    'export { createGenuiConfigRendererElement, GENUI_CONFIG_RENDERER_TAG };',
    `export const materialKey = ${toLiteral(materialKey)};`,
    `export const materials = __mergeMaterials(${mergedList});`,
    'export const GenuiConfigRendererElement = createGenuiConfigRendererElement(materials);',
    `export function registerGenuiConfigRenderer(tagName = ${toLiteral(tagName)}, element = GenuiConfigRendererElement) {`,
    '  defineGenuiConfigRenderer(tagName, element);',
    '}',
    'if (typeof window !== "undefined") registerGenuiConfigRenderer();',
    '',
  ].join('\n');
}

function createResolverPlugin(options: BuildWebComponentOptions, runtime: { factory: string; core: string }): Plugin {
  const materialEntries = options.materials.map((material) => normalizePath(material.entry));
  return {
    name: 'genui-web-component-builder',
    resolveId(id) {
      if (id === FACTORY_ID) return normalizePath(runtime.factory);
      if (id === CORE_ID) return normalizePath(runtime.core);
      if (id.startsWith(MATERIAL_ID_PREFIX)) {
        const index = Number(id.slice(MATERIAL_ID_PREFIX.length));
        return materialEntries[index];
      }
      return null;
    },
  };
}

function createViteConfig(
  options: BuildWebComponentOptions,
  runtime: { factory: string; core: string; vueDir: string },
  entryFile: string,
): InlineConfig {
  return createWebComponentViteConfig({
    root: process.cwd(),
    entry: entryFile,
    outDir: options.outDir,
    fileName: options.fileName,
    emptyOutDir: false,
    standalone: true,
    virtualModulesPlugin: createResolverPlugin(options, runtime),
    // 保证整份产物只使用一份 Vue，避免工厂与物料各自打包 Vue 导致响应式失效
    vueDir: normalizePath(runtime.vueDir),
    logLevel: options.logLevel ?? 'info',
    minify: options.minify === false ? false : 'esbuild',
    sourcemap: Boolean(options.sourcemap),
    target: 'es2020',
    chunkSizeWarningLimit: 4000,
  });
}

export { createWebComponentDts };

export async function buildWebComponent(options: BuildWebComponentOptions): Promise<BuildWebComponentResult> {
  const runtime = resolveRuntimeEntries();
  const jsFile = path.join(options.outDir, `${options.fileName}.js`);
  const dtsFile = path.join(options.outDir, `${options.fileName}.d.ts`);
  const entryFile = path.join(os.tmpdir(), `genui-web-component-entry-${process.pid}-${Date.now()}.mjs`);

  await mkdir(options.outDir, { recursive: true });
  writeFileSync(entryFile, createEntryCode(options), 'utf-8');
  try {
    await build(createViteConfig(options, runtime, entryFile));
  } finally {
    await rm(entryFile, { force: true });
  }

  writeFileSync(dtsFile, createWebComponentDts(), 'utf-8');

  const files = [jsFile, dtsFile];
  if (options.sourcemap) files.push(`${jsFile}.map`);
  if (!existsSync(jsFile)) {
    throw new Error(`构建未生成预期的产物文件：${jsFile}`);
  }

  return {
    outDir: options.outDir,
    fileName: options.fileName,
    files: files.filter((file) => existsSync(file)),
    materials: options.materials,
  };
}

export function readPackageVersion(): string {
  const pkg = JSON.parse(readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf-8')) as { version?: string };
  return pkg.version ?? '0.0.0';
}
