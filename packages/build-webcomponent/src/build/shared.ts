import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizePath, type Plugin } from 'vite';
import type { Framework } from '../args';
import type { ResolvedMaterialsSource } from '../resolve-materials';

export const FACTORY_ID = 'virtual:genui-web-component-factory';
export const CORE_ID = 'virtual:genui-web-component-core';
export const MATERIAL_ID_PREFIX = 'virtual:genui-web-component-material:';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Works from both dist/ and the source tree */
export function findPackageRoot(start = here): string {
  let dir = start;
  for (;;) {
    if (existsSync(path.join(dir, 'package.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(`无法定位 @opentiny/genui-sdk-build-webcomponent 包根目录（起始于 ${start}）`);
    }
    dir = parent;
  }
}

export const PACKAGE_ROOT = findPackageRoot();

/**
 * 三端共用的打包配置与产物信息。
 * 工厂与虚拟模块由各框架的 builder 提供，这里只收敛类型和绝对路径。
 */
export interface BuildWebComponentOptions {
  framework: Framework;
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
  /** 只导出元素本身（默认产物包使用），命令行不暴露 */
  minimalExports?: boolean;
}

export interface BuildWebComponentResult {
  outDir: string;
  fileName: string;
  files: string[];
  materials: ResolvedMaterialsSource[];
  framework: Framework;
}

const toLiteral = (value: string) => JSON.stringify(value);

/** Merged materials key, used for debugging and bundle metadata */
export function createMaterialKey(materials: ResolvedMaterialsSource[]): string {
  return materials.map((material) => material.input).join('+');
}

/** Virtual modules mapping each materials package to an entry Rollup can bundle */
export function createResolverPlugin(
  materials: ResolvedMaterialsSource[],
  runtime: Record<string, string>,
): Plugin {
  const materialEntries = materials.map((material) => normalizePath(material.entry));
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

/**
 * Resolves packages left external in the prebuilt factory (for example the TinyVue
 * component library on the Vue side) from the consumer's project or the materials
 * package, so both share a single implementation.
 */
export function createCwdResolverPlugin(fromDirs: string | string[], patterns: RegExp[]): Plugin {
  const dirs = Array.isArray(fromDirs) ? fromDirs : [fromDirs];
  const requires = dirs.map((dir) => createRequire(path.join(dir, 'index.js')));
  return {
    name: 'genui-web-component-cwd-resolver',
    enforce: 'pre',
    resolveId(id) {
      if (!patterns.some((pattern) => pattern.test(id))) return null;
      for (const requireFrom of requires) {
        try {
          return normalizePath(requireFrom.resolve(id));
        } catch {
          // 继续尝试下一个位置
        }
      }
      return null;
    },
  };
}

/**
 * Builds the temporary entry: inject materials and register the tag.
 * Angular registers asynchronously, so its entry exports a Promise, matching the
 * declarations of the default package.
 */
export function createEntryCode(options: BuildWebComponentOptions): string {
  const { materials, tagName, framework } = options;
  const imports = materials.map(
    (material, index) => `import { materials as __material${index} } from '${MATERIAL_ID_PREFIX}${index}';`,
  );
  const mergedList = materials.map((_, index) => `__material${index}`).join(', ');
  const materialKey = createMaterialKey(materials);

  if (options.minimalExports) {
    return [
      `import { createGenuiConfigRendererElement, defineGenuiConfigRenderer } from '${FACTORY_ID}';`,
      ...imports,
      `import { mergeMaterials as __mergeMaterials } from '${CORE_ID}';`,
      '',
      `const materials = __mergeMaterials(${mergedList});`,
      'export const GenuiConfigRendererElement = createGenuiConfigRendererElement(materials);',
      `if (typeof window !== 'undefined') defineGenuiConfigRenderer(${toLiteral(tagName)}, GenuiConfigRendererElement);`,
      '',
    ].join('\n');
  }

  const common = [
    `import { createGenuiConfigRendererElement, defineGenuiConfigRenderer, GENUI_CONFIG_RENDERER_TAG } from '${FACTORY_ID}';`,
    ...imports,
    `import { mergeMaterials as __mergeMaterials } from '${CORE_ID}';`,
    '',
    'export { createGenuiConfigRendererElement, GENUI_CONFIG_RENDERER_TAG };',
    `export const materialKey = ${toLiteral(materialKey)};`,
    `export const materials = __mergeMaterials(${mergedList});`,
  ];

  if (framework === 'angular') {
    return [
      // Angular 的变更检测依赖 zone.js，必须在注册标签前完成 patch
      `import 'zone.js';`,
      ...common,
      `export function registerGenuiConfigRenderer(tagName = ${toLiteral(tagName)}) {`,
      '  return defineGenuiConfigRenderer(tagName, materials);',
      '}',
      'export const GenuiConfigRendererElement = registerGenuiConfigRenderer();',
      '',
    ].join('\n');
  }

  return [
    ...common,
    'export const GenuiConfigRendererElement = createGenuiConfigRendererElement(materials);',
    `export function registerGenuiConfigRenderer(tagName = ${toLiteral(tagName)}, element = GenuiConfigRendererElement) {`,
    '  defineGenuiConfigRenderer(tagName, element);',
    '}',
    'if (typeof window !== "undefined") registerGenuiConfigRenderer();',
    '',
  ].join('\n');
}

export function readPackageVersion(): string {
  const pkg = JSON.parse(readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf-8')) as { version?: string };
  return pkg.version ?? '0.0.0';
}
