import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { IMaterialsMeta } from '@opentiny/genui-sdk-core';

/** 物料模块默认读取的导出名 */
export const DEFAULT_MATERIALS_EXPORT = 'materialsMeta';

/**
 * 按 `import` 条件解析 `exports` 时使用的条件集合。
 *
 * 与服务端运行时的 ESM 导入保持一致：纯 ESM 包只声明 `import` 入口，
 * 双入口包也可能为 require / import 声明不同目标，因此需要显式按 import 条件取值。
 */
const IMPORT_CONDITIONS = ['node', 'import'];

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
async function importFile(absolutePath: string): Promise<unknown> {
  if (absolutePath.endsWith('.json')) {
    return JSON.parse(readFileSync(absolutePath, 'utf8'));
  }

  return import(pathToFileURL(absolutePath).href);
}

/**
 * 读取文件路径对应的模块。
 *
 * `file:` URL 需要先转成文件系统路径，否则会被当成相对于 `cwd` 的普通路径解析，导致读到错误的文件。
 */
async function importPathModule(targetPath: string, cwd: string): Promise<unknown> {
  const filePath = targetPath.startsWith('file:') ? fileURLToPath(targetPath) : targetPath;
  const absolutePath = isAbsolute(filePath) ? filePath : resolve(cwd, filePath);

  return importFile(absolutePath);
}

/**
 * 拆分包名与子路径，如 `@scope/pkg/meta` → `@scope/pkg` + `./meta`。
 */
function splitPackageSpecifier(specifier: string): { name: string; subpath: string } {
  const segments = specifier.split('/');
  const nameLength = specifier.startsWith('@') ? 2 : 1;

  return {
    name: segments.slice(0, nameLength).join('/'),
    subpath: segments.length > nameLength ? `./${segments.slice(nameLength).join('/')}` : '.',
  };
}

/**
 * 创建以 `cwd` 为基准的 require，用于按用户项目的依赖树解析包。
 */
function createRequireFromCwd(cwd: string) {
  return createRequire(resolve(cwd, '__genui_resolve_materials__.js'));
}

/**
 * 在 `cwd` 的查找路径中定位已安装的物料包目录。
 */
function findPackageDir(packageName: string, cwd: string): string | undefined {
  const searchDirs = createRequireFromCwd(cwd).resolve.paths(packageName) ?? [];

  for (const searchDir of searchDirs) {
    const packageDir = join(searchDir, packageName);
    if (existsSync(join(packageDir, 'package.json'))) {
      return packageDir;
    }
  }

  return undefined;
}

/**
 * 把 `exports` 中的目标声明（字符串 / 条件对象 / 数组回退）按 import 条件取出相对路径。
 */
function pickExportTarget(target: unknown, conditions: string[]): string | undefined {
  if (typeof target === 'string') {
    return target;
  }

  if (Array.isArray(target)) {
    for (const item of target) {
      const picked = pickExportTarget(item, conditions);
      if (picked) {
        return picked;
      }
    }
    return undefined;
  }

  if (target && typeof target === 'object') {
    for (const [condition, value] of Object.entries(target as Record<string, unknown>)) {
      if (condition === 'default' || conditions.includes(condition)) {
        const picked = pickExportTarget(value, conditions);
        if (picked) {
          return picked;
        }
      }
    }
  }

  return undefined;
}

/**
 * 将 `*` 通配符匹配到的内容替换进 `exports` 目标声明中（如 `./dist/*.js`）。
 */
function fillWildcard(target: unknown, wildcard: string): unknown {
  if (typeof target === 'string') {
    return target.split('*').join(wildcard);
  }
  if (Array.isArray(target)) {
    return target.map((item) => fillWildcard(item, wildcard));
  }
  if (target && typeof target === 'object') {
    return Object.fromEntries(
      Object.entries(target as Record<string, unknown>).map(([key, value]) => [key, fillWildcard(value, wildcard)]),
    );
  }
  return target;
}

/**
 * 按子路径从 `exports` 字段中取出目标声明，支持精确匹配与 `*` 通配符匹配。
 */
function pickSubpathTarget(exportsField: unknown, subpath: string): unknown {
  // `exports: "./index.js"`、`exports: { import: ..., require: ... }` 等只描述包入口的写法
  if (typeof exportsField === 'string' || Array.isArray(exportsField) || exportsField === null) {
    return subpath === '.' ? exportsField : undefined;
  }

  if (!exportsField || typeof exportsField !== 'object') {
    return undefined;
  }

  const subpathMap = exportsField as Record<string, unknown>;
  if (!Object.keys(subpathMap).some((key) => key.startsWith('.'))) {
    return subpath === '.' ? subpathMap : undefined;
  }

  if (subpathMap[subpath] !== undefined) {
    return subpathMap[subpath];
  }

  // 通配符按最长字面前缀匹配，与 Node 的解析顺序一致
  let matchedKey: string | undefined;
  let matchedWildcard = '';

  for (const key of Object.keys(subpathMap)) {
    const starIndex = key.indexOf('*');
    if (starIndex === -1) {
      continue;
    }

    const prefix = key.slice(0, starIndex);
    const suffix = key.slice(starIndex + 1);
    const isMatch =
      subpath.length >= prefix.length + suffix.length && subpath.startsWith(prefix) && subpath.endsWith(suffix);

    if (isMatch && (!matchedKey || prefix.length > matchedKey.indexOf('*'))) {
      matchedKey = key;
      matchedWildcard = subpath.slice(prefix.length, subpath.length - suffix.length);
    }
  }

  return matchedKey === undefined ? undefined : fillWildcard(subpathMap[matchedKey], matchedWildcard);
}

/**
 * 按 import 条件解析出包内入口文件的绝对路径。
 *
 * 仅处理声明了 `exports` 的包；其余情况交给 require 条件解析，避免重复实现 Node 的完整解析算法。
 */
function resolvePackageEntry(packageDir: string, subpath: string): string | undefined {
  let packageJson: Record<string, unknown>;

  try {
    packageJson = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));
  } catch {
    return undefined;
  }

  const exportsField = packageJson.exports;
  if (exportsField === undefined) {
    return undefined;
  }

  const target = pickSubpathTarget(exportsField, subpath);
  const relativePath = pickExportTarget(target, IMPORT_CONDITIONS);

  if (!relativePath || !relativePath.startsWith('./')) {
    return undefined;
  }

  const entryPath = join(packageDir, relativePath);
  return existsSync(entryPath) ? entryPath : undefined;
}

/**
 * 以 `cwd` 为基准、按 import 条件解析包入口。
 */
function resolvePackageEntryFromCwd(specifier: string, cwd: string): string | undefined {
  const { name, subpath } = splitPackageSpecifier(specifier);
  const packageDir = findPackageDir(name, cwd);

  return packageDir === undefined ? undefined : resolvePackageEntry(packageDir, subpath);
}

/**
 * 解析并加载包名模块。
 *
 * 优先按 import 条件、以 `cwd` 为基准解析包入口，保证：
 * - `npx` / 全局安装场景下能命中用户项目里安装的物料包；
 * - 只声明 `import` 入口的纯 ESM 包不会因 `exports` 缺少 `require` 条件而解析失败；
 * - require / import 入口不同的双入口包命中 `import` 目标。
 *
 * 解析失败时回退到 `cwd` 的 require 条件解析，最后回退到本模块自身的解析规则。
 */
async function importPackageModule(specifier: string, cwd: string): Promise<unknown> {
  const entryPath = resolvePackageEntryFromCwd(specifier, cwd);
  if (entryPath) {
    return importFile(entryPath);
  }

  const requireFromCwd = createRequireFromCwd(cwd);

  try {
    const resolvedPath = requireFromCwd.resolve(specifier);
    return await importFile(resolvedPath);
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
