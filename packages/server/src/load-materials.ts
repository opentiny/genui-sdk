import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { isAbsolute, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { IMaterialsMeta } from '@opentiny/genui-sdk-core';

/** 物料模块默认读取的导出名 */
export const DEFAULT_MATERIALS_EXPORT = 'materialsMeta';

export interface ILoadMaterialsMetaOptions {
  /**
   * 解析相对路径与包名时使用的基准目录，默认 `process.cwd()`。
   */
  cwd?: string;
  /**
   * 从物料模块中读取的具名导出，默认 `materialsMeta`。
   * 例如 Vue OpenTiny 物料的精简集需传 `miniMaterialsMeta`。
   */
  exportName?: string;
}

/**
 * 判断 specifier 是否为文件路径（相对路径 / 绝对路径 / file: URL）。
 * 其余情况按包名处理。
 */
export function isMaterialsPathSpecifier(specifier: string): boolean {
  return (
    specifier.startsWith('.') ||
    specifier.startsWith('/') ||
    specifier.startsWith('file:') ||
    /^[a-zA-Z]:[\\/]/.test(specifier)
  );
}

/**
 * 判断包名是否已经带有子路径，例如 `@scope/pkg/meta`、`pkg/meta`。
 */
function hasPackageSubpath(specifier: string): boolean {
  if (specifier.startsWith('@')) {
    return specifier.split('/').length > 2;
  }
  return specifier.includes('/');
}

/**
 * 生成候选 specifier 列表。
 *
 * 物料包通常把物料元数据放在 `./meta` 子路径（体积小、不引入框架运行时），
 * 根入口虽然也可能导出 `materialsMeta`，但会连带加载组件实现。
 * 因此对只给了包名的情况，优先尝试 `<包名>/meta`，再回退到包入口。
 */
function buildSpecifierCandidates(specifier: string): string[] {
  if (isMaterialsPathSpecifier(specifier) || hasPackageSubpath(specifier)) {
    return [specifier];
  }
  return [`${specifier}/meta`, specifier];
}

/**
 * 读取 JSON 文件或动态 import 模块文件。
 */
async function importPathModule(targetPath: string, cwd: string): Promise<unknown> {
  const absolutePath = isAbsolute(targetPath) ? targetPath : resolve(cwd, targetPath);

  if (absolutePath.endsWith('.json')) {
    return JSON.parse(readFileSync(absolutePath, 'utf8'));
  }

  return import(pathToFileURL(absolutePath).href);
}

/**
 * 解析并加载包名模块。
 *
 * 优先从 `cwd` 解析，保证 `npx` / 全局安装场景下能命中用户项目里安装的物料包；
 * 解析失败时回退到本模块自身的解析规则（兼容仅提供 `import` 条件的纯 ESM 包）。
 */
async function importPackageModule(specifier: string, cwd: string): Promise<unknown> {
  const requireFromCwd = createRequire(resolve(cwd, '__genui_resolve_materials__.js'));

  try {
    const resolvedPath = requireFromCwd.resolve(specifier);
    return await import(pathToFileURL(resolvedPath).href);
  } catch {
    return import(specifier);
  }
}

async function importModule(specifier: string, cwd: string): Promise<unknown> {
  return isMaterialsPathSpecifier(specifier)
    ? importPathModule(specifier, cwd)
    : importPackageModule(specifier, cwd);
}

/**
 * 从模块命名空间对象中取出目标导出。
 *
 * 依次尝试：指定导出 → `default` 导出 → 模块本身就是物料元数据（JSON 文件 / `export default` 场景）。
 */
function pickExport(moduleExports: unknown, exportName: string): unknown {
  if (!moduleExports || typeof moduleExports !== 'object') {
    return undefined;
  }

  const namespace = moduleExports as Record<string, unknown>;
  if (namespace[exportName] !== undefined) {
    return namespace[exportName];
  }

  if (exportName === DEFAULT_MATERIALS_EXPORT) {
    if (namespace.default !== undefined) {
      return namespace.default;
    }
    if (Array.isArray(namespace.materials)) {
      return namespace;
    }
  }

  return undefined;
}

/**
 * 校验并补全物料元数据，保证后续 genPrompt 能安全读取各字段。
 */
function normalizeMaterialsMeta(value: unknown, source: string, exportName: string): IMaterialsMeta {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`物料 ${source} 的导出 ${exportName} 不是有效的物料元数据对象`);
  }

  const meta = value as Partial<IMaterialsMeta>;
  if (!Array.isArray(meta.materials)) {
    throw new Error(`物料 ${source} 的导出 ${exportName} 缺少 materials 数组`);
  }
  if (!Array.isArray(meta.examples)) {
    throw new Error(`物料 ${source} 的导出 ${exportName} 缺少 examples 数组`);
  }

  return {
    materials: meta.materials,
    examples: meta.examples,
    whiteList: Array.isArray(meta.whiteList) ? meta.whiteList : [],
    ...(meta.wrapperComponent !== undefined ? { wrapperComponent: meta.wrapperComponent } : {}),
    ...(Array.isArray(meta.rules) ? { rules: meta.rules } : {}),
  };
}

/**
 * 按文件路径或包名加载物料元数据（`IMaterialsMeta`）。
 *
 * 支持两种来源：
 * - 文件路径：相对路径（基于 `cwd`）、绝对路径，或 `file:` URL；`.json` 文件会被解析为物料元数据。
 * - 包名：如 `@opentiny/genui-sdk-materials-react-antd`。只给包名时会优先尝试 `<包名>/meta`。
 *
 * @param source 物料模块路径或包名
 * @param options 解析基准目录与导出名
 * @returns 物料元数据
 *
 * @example
 * ```ts
 * // 包名（自动优先命中 /meta 子路径）
 * await loadMaterialsMeta('@opentiny/genui-sdk-materials-react-antd');
 * // 包名 + 子路径 + 指定导出（Vue 精简集）
 * await loadMaterialsMeta('@opentiny/genui-sdk-materials-vue-opentiny-vue/meta', {
 *   exportName: 'miniMaterialsMeta',
 * });
 * // 本地文件
 * await loadMaterialsMeta('./my-materials.mjs');
 * ```
 */
export async function loadMaterialsMeta(
  source: string,
  options: ILoadMaterialsMetaOptions = {},
): Promise<IMaterialsMeta> {
  const cwd = options.cwd ?? process.cwd();
  const exportName = options.exportName || DEFAULT_MATERIALS_EXPORT;

  if (!source) {
    throw new Error('物料来源不能为空');
  }

  const attempts: string[] = [];

  for (const candidate of buildSpecifierCandidates(source)) {
    let moduleExports: unknown;

    try {
      moduleExports = await importModule(candidate, cwd);
    } catch (error) {
      attempts.push(`  - ${candidate}：${(error as Error).message}`);
      continue;
    }

    const value = pickExport(moduleExports, exportName);
    if (value === undefined) {
      const available = Object.keys(moduleExports as Record<string, unknown>).join(', ') || '（无导出）';
      attempts.push(`  - ${candidate}：未找到导出 ${exportName}，可用导出：${available}`);
      continue;
    }

    return normalizeMaterialsMeta(value, source, exportName);
  }

  throw new Error(`无法加载物料：${source}\n已尝试：\n${attempts.join('\n')}`);
}
