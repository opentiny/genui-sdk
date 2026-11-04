import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { IMaterialsMeta } from '@opentiny/genui-sdk-core';

const DEFAULT_MATERIALS_EXPORT = 'materialsMeta';

const IMPORT_CONDITIONS = ['node', 'import'];

export interface ILoadMaterialsMetaOptions {
  /** Base directory for paths and package resolution. Defaults to `process.cwd()`. */
  cwd?: string;
  /** Named export to read. Defaults to `materialsMeta` (e.g. `miniMaterialsMeta` for the Vue mini set). */
  exportName?: string;
}

/** Whether the specifier is a file path instead of a package name. */
function isMaterialsPathSpecifier(specifier: string): boolean {
  return (
    specifier.startsWith('.') ||
    specifier.startsWith('/') ||
    specifier.startsWith('file:') ||
    /^[a-zA-Z]:[\\/]/.test(specifier)
  );
}

function hasPackageSubpath(specifier: string): boolean {
  if (specifier.startsWith('@')) {
    return specifier.split('/').length > 2;
  }
  return specifier.includes('/');
}

/** Try `<pkg>/meta` first (lighter, no framework runtime), then the package root. */
function buildSpecifierCandidates(specifier: string): string[] {
  if (isMaterialsPathSpecifier(specifier) || hasPackageSubpath(specifier)) {
    return [specifier];
  }
  return [`${specifier}/meta`, specifier];
}

async function importFile(absolutePath: string): Promise<unknown> {
  if (absolutePath.endsWith('.json')) {
    return JSON.parse(readFileSync(absolutePath, 'utf8'));
  }

  return import(pathToFileURL(absolutePath).href);
}

/** Load a module from a file path; `file:` URLs are converted to filesystem paths first. */
async function importPathModule(targetPath: string, cwd: string): Promise<unknown> {
  const filePath = targetPath.startsWith('file:') ? fileURLToPath(targetPath) : targetPath;
  const absolutePath = isAbsolute(filePath) ? filePath : resolve(cwd, filePath);

  return importFile(absolutePath);
}

/** Split a specifier into package name and subpath, e.g. `@scope/pkg/meta`. */
function splitPackageSpecifier(specifier: string): { name: string; subpath: string } {
  const segments = specifier.split('/');
  const nameLength = specifier.startsWith('@') ? 2 : 1;

  return {
    name: segments.slice(0, nameLength).join('/'),
    subpath: segments.length > nameLength ? `./${segments.slice(nameLength).join('/')}` : '.',
  };
}

/** Create a `require` anchored at `cwd`, so packages resolve from the user's project. */
function createRequireFromCwd(cwd: string) {
  return createRequire(resolve(cwd, '__genui_resolve_materials__.js'));
}

/** Locate an installed package directory through the `cwd` lookup paths. */
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

/** Pick an `exports` target (string, conditions or array) for the given import conditions. */
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

/** Replace `*` in an `exports` target with the matched wildcard. */
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

/** Pick the `exports` entry for a subpath, supporting exact and `*` wildcard matches. */
function pickSubpathTarget(exportsField: unknown, subpath: string): unknown {
  // `exports: "./index.js"` 或条件对象：只描述包入口
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

  // 通配符按最长字面前缀匹配
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

/** Resolve a package entry via import conditions; packages without `exports` fall back to `require`. */
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

function resolvePackageEntryFromCwd(specifier: string, cwd: string): string | undefined {
  const { name, subpath } = splitPackageSpecifier(specifier);
  const packageDir = findPackageDir(name, cwd);

  return packageDir === undefined ? undefined : resolvePackageEntry(packageDir, subpath);
}

/**
 * Import a package by name.
 *
 * Resolves with import conditions from `cwd` first, so ESM-only packages and dual packages hit their
 * `import` target; then falls back to `require` resolution from `cwd`, then to this module's own rules.
 */
async function importPackageModule(specifier: string, cwd: string): Promise<unknown> {
  const entryPath = resolvePackageEntryFromCwd(specifier, cwd);
  if (entryPath) {
    return importFile(entryPath);
  }

  const requireFromCwd = createRequireFromCwd(cwd);

  let resolvedPath: string;
  try {
    resolvedPath = requireFromCwd.resolve(specifier);
  } catch {
    return import(specifier);
  }

  // 解析成功后再加载，模块自身的加载/执行错误直接抛出，不被兜底掩盖
  return importFile(resolvedPath);
}

async function importModule(specifier: string, cwd: string): Promise<unknown> {
  return isMaterialsPathSpecifier(specifier)
    ? importPathModule(specifier, cwd)
    : importPackageModule(specifier, cwd);
}

/** Named export, then `default`, then the module itself (for JSON / `export default`). */
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

/** Validate the metadata and fill in optional fields. */
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
    ...meta,
    materials: meta.materials,
    examples: meta.examples,
    whiteList: Array.isArray(meta.whiteList) ? meta.whiteList : [],
  };
}

/**
 * Load materials metadata (`IMaterialsMeta`) from a file path or a package name.
 *
 * - File path: relative to `cwd`, absolute or `file:` URL; `.json` files are parsed directly.
 * - Package: e.g. `@opentiny/genui-sdk-materials-react-antd`; a bare name tries `<pkg>/meta` first.
 *
 * @example
 * ```ts
 * await loadMaterialsMeta('@opentiny/genui-sdk-materials-react-antd');
 * await loadMaterialsMeta('@opentiny/genui-sdk-materials-vue-opentiny-vue/meta', {
 *   exportName: 'miniMaterialsMeta',
 * });
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
