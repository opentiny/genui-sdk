import { existsSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

const DEFAULT_MATERIALS_SUBPATH = 'materials';

export interface ResolvedMaterialsSource {
  /** 原始输入，用于日志与 materialKey */
  input: string;
  /** 绝对路径 */
  entry: string;
  kind: 'path' | 'package';
}

function isPathLike(spec: string): boolean {
  return (
    spec.startsWith('.') ||
    spec.startsWith('/') ||
    spec.startsWith('~') ||
    path.isAbsolute(spec) ||
    /^[A-Za-z]:[\\/]/.test(spec)
  );
}

/** ~ 必须展开成绝对路径，否则会被当成相对路径 */
function expandHome(spec: string): string {
  if (spec === '~') return os.homedir();
  if (spec.startsWith('~/') || spec.startsWith(`~${path.sep}`)) {
    return path.join(os.homedir(), spec.slice(2));
  }
  return spec;
}

function pickCondition(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['import', 'module', 'browser', 'default', 'node', 'require']) {
      const picked = pickCondition(record[key]);
      if (picked) return picked;
    }
  }
  return undefined;
}

function pickPackageEntry(pkg: Record<string, any>, subpath?: string): string | undefined {
  const exportsField = pkg.exports;

  if (exportsField) {
    if (subpath) {
      const key = `./${subpath}`;
      if (exportsField && typeof exportsField === 'object' && key in exportsField) {
        const picked = pickCondition(exportsField[key]);
        if (picked) return picked;
      }
    } else if (typeof exportsField === 'string') {
      return exportsField;
    } else if (exportsField && typeof exportsField === 'object') {
      const picked = pickCondition(exportsField['.'] ?? exportsField);
      if (picked) return picked;
    }
  }

  // 只有主入口回退到 module / main
  if (subpath) return undefined;
  return pkg.module || pkg.main;
}

function resolveExisting(baseDir: string, entry: string | undefined): string | undefined {
  if (!entry) return undefined;
  const resolved = path.resolve(baseDir, entry);
  return existsSync(resolved) ? resolved : undefined;
}

function resolveLocalEntry(target: string, input: string): string {
  if (!existsSync(target)) {
    throw new Error(`物料路径不存在：${input}（解析为 ${target}）`);
  }

  if (statSync(target).isFile()) {
    return target;
  }

  const pkgPath = path.join(target, 'package.json');
  if (existsSync(pkgPath)) {
    let pkg: Record<string, any> = {};
    try {
      pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    } catch (error) {
      throw new Error(`物料目录的 package.json 解析失败：${pkgPath}（${(error as Error).message}）`);
    }
    const fromExports = resolveExisting(target, pickPackageEntry(pkg, DEFAULT_MATERIALS_SUBPATH));
    if (fromExports) return fromExports;
    const fromMain = resolveExisting(target, pickPackageEntry(pkg));
    if (fromMain) return fromMain;
  }

  const candidates = [
    `dist/${DEFAULT_MATERIALS_SUBPATH}.js`,
    'dist/index.js',
    'src/materials/index.ts',
    'src/index.ts',
    'index.js',
  ];
  for (const candidate of candidates) {
    const resolved = path.join(target, candidate);
    if (existsSync(resolved)) return resolved;
  }

  throw new Error(`无法在目录 ${target} 中找到物料入口（${input}）`);
}

function splitPackageSpec(spec: string): { packageName: string; subpath: string } {
  const parts = spec.split('/');
  if (spec.startsWith('@') && parts.length >= 2) {
    return { packageName: parts.slice(0, 2).join('/'), subpath: parts.slice(2).join('/') };
  }
  return { packageName: parts[0], subpath: parts.slice(1).join('/') };
}

function findPackageDir(packageName: string, from: string): string | undefined {
  let dir = from;
  for (;;) {
    const candidate = path.join(dir, 'node_modules', packageName);
    if (existsSync(path.join(candidate, 'package.json'))) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

export function resolvePackageDir(packageName: string, from: string): string {
  const packageDir = findPackageDir(packageName, from);
  if (!packageDir) {
    throw new Error(`无法从 ${from} 向上找到依赖 ${packageName}，请确认依赖已正确安装。`);
  }
  return packageDir;
}

/** 不走 require.resolve：core 这类包只声明了 import 条件，require 条件解析不到 */
export function resolvePackageMainEntry(packageName: string, from: string): string {
  const packageDir = resolvePackageDir(packageName, from);
  const pkg = JSON.parse(readFileSync(path.join(packageDir, 'package.json'), 'utf-8')) as Record<string, any>;
  const entry = resolveExisting(packageDir, pickPackageEntry(pkg));
  if (!entry) {
    throw new Error(`无法确定 ${packageName} 的入口文件（${path.join(packageDir, 'package.json')}）`);
  }
  return entry;
}

/** require.resolve 受 CJS 条件限制，兜底直接读 package.json 的 exports / module / main */
function resolvePackageViaManifest(spec: string, cwd: string): string | undefined {
  const { packageName, subpath } = splitPackageSpec(spec);
  const packageDir = findPackageDir(packageName, cwd);
  if (!packageDir) return undefined;

  const pkg = JSON.parse(readFileSync(path.join(packageDir, 'package.json'), 'utf-8')) as Record<string, any>;
  const candidates = subpath
    ? [pickPackageEntry(pkg, subpath)]
    : [pickPackageEntry(pkg, DEFAULT_MATERIALS_SUBPATH), pickPackageEntry(pkg)];

  for (const candidate of candidates) {
    const resolved = resolveExisting(packageDir, candidate);
    if (resolved) return resolved;
  }
  return undefined;
}

function resolvePackageEntry(spec: string, cwd: string): string {
  const require = createRequire(path.join(cwd, '__genui_resolve_materials__.js'));
  const tryResolve = (request: string): string | undefined => {
    try {
      return require.resolve(request);
    } catch {
      return undefined;
    }
  };

  const { subpath } = splitPackageSpec(spec);

  if (!subpath) {
    const withDefaultSubpath = tryResolve(`${spec}/${DEFAULT_MATERIALS_SUBPATH}`);
    if (withDefaultSubpath) return withDefaultSubpath;
  }

  const direct = tryResolve(spec);
  if (direct) return direct;

  const viaManifest = resolvePackageViaManifest(spec, cwd);
  if (viaManifest) return viaManifest;

  throw new Error(
    `无法解析物料 "${spec}"。请确认已在当前项目中安装该包（或在命令执行目录下能解析到），或改用本地路径。`,
  );
}

export function resolveMaterialsSource(input: string, cwd: string): ResolvedMaterialsSource {
  const spec = input.trim();
  if (!spec) {
    throw new Error('物料来源不能为空');
  }

  const localPath = path.resolve(cwd, expandHome(spec));
  if (isPathLike(spec) || existsSync(localPath)) {
    return { input: spec, entry: resolveLocalEntry(localPath, spec), kind: 'path' };
  }

  return { input: spec, entry: resolvePackageEntry(spec, cwd), kind: 'package' };
}

export function resolveMaterialsSources(inputs: string[], cwd: string): ResolvedMaterialsSource[] {
  if (inputs.length === 0) {
    throw new Error('请至少通过 --materials 指定一个物料来源');
  }
  return inputs.map((input) => resolveMaterialsSource(input, cwd));
}
