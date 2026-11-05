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

/** 兼容从 dist/ 和源码目录两种位置运行 */
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

/** 物料合并后的 key，用于调试与产物元信息 */
export function createMaterialKey(materials: ResolvedMaterialsSource[]): string {
  return materials.map((material) => material.input).join('+');
}

/** 虚拟模块：把每个物料包映射成可打包的入口 */
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
 * 预编译工厂里被 external 掉的包（例如 Vue 端依赖的 TinyVue 组件库）
 * 需要从执行命令的项目或物料所在包解析，确保和物料共用同一份实现。
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
 * 生成临时入口：注入物料、注册标签。
 * Angular 的注册是异步的，入口会直接导出 Promise，与默认产物包保持同一套声明。
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
