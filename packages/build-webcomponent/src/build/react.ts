import { existsSync, writeFileSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { build, normalizePath } from 'vite';
import { createWebComponentDts } from '../dts';
import { resolvePackageDir, resolvePackageMainEntry } from '../resolve-materials';
import { createWebComponentViteConfig } from '../frameworks/react/build-config';
import {
  PACKAGE_ROOT,
  createEntryCode,
  createResolverPlugin,
  type BuildWebComponentOptions,
  type BuildWebComponentResult,
} from './shared';

/** 工厂是本包预编译好的产物；genui 运行时由本包 dependencies 提供 */
const FACTORY_FILE = path.join(PACKAGE_ROOT, 'dist/frameworks/react/index.js');

/** 本地优先：使用方项目里的 react 与物料共用一份；找不到时回退到 CLI 包安装的那份 */
function resolveReactDir(packageName: 'react' | 'react-dom', cwd: string): string {
  const froms = [cwd, PACKAGE_ROOT];
  for (const from of froms) {
    try {
      return resolvePackageDir(packageName, from);
    } catch {
      // 继续尝试下一个位置
    }
  }
  throw new Error(
    `无法解析 ${packageName}。Web Component 会把 React 打进产物，请在执行命令的项目里安装 react 与 react-dom（>=18）。`,
  );
}

function resolveRuntime(cwd: string) {
  if (!existsSync(FACTORY_FILE)) {
    throw new Error(
      `未找到预编译的 React 工厂：${path.relative(PACKAGE_ROOT, FACTORY_FILE)}，当前安装的 @opentiny/genui-sdk-build-webcomponent 可能不完整，请升级到最新版本。`,
    );
  }

  return {
    factory: FACTORY_FILE,
    core: resolvePackageMainEntry('@opentiny/genui-sdk-core', PACKAGE_ROOT),
    reactDir: resolveReactDir('react', cwd),
    reactDomDir: resolveReactDir('react-dom', cwd),
  };
}

export async function buildReactWebComponent(options: BuildWebComponentOptions): Promise<BuildWebComponentResult> {
  const runtime = resolveRuntime(process.cwd());
  const jsFile = path.join(options.outDir, `${options.fileName}.js`);
  const dtsFile = path.join(options.outDir, `${options.fileName}.d.ts`);
  const entryFile = path.join(os.tmpdir(), `genui-web-component-react-${process.pid}-${Date.now()}.mjs`);

  await mkdir(options.outDir, { recursive: true });
  writeFileSync(entryFile, createEntryCode(options), 'utf-8');

  try {
    await build(
      createWebComponentViteConfig({
        root: process.cwd(),
        entry: entryFile,
        outDir: options.outDir,
        fileName: options.fileName,
        emptyOutDir: false,
        standalone: true,
        virtualModulesPlugin: createResolverPlugin(options.materials, runtime),
        // 保证整份产物只使用一份 React，避免工厂与物料各自打包 React 导致 hooks 报错
        reactDir: normalizePath(runtime.reactDir),
        reactDomDir: normalizePath(runtime.reactDomDir),
        logLevel: options.logLevel ?? 'info',
        minify: options.minify === false ? false : 'esbuild',
        sourcemap: Boolean(options.sourcemap),
        target: 'es2020',
        chunkSizeWarningLimit: 4000,
      }),
    );
  } finally {
    await rm(entryFile, { force: true });
  }

  writeFileSync(dtsFile, createWebComponentDts('react', Boolean(options.minimalExports)), 'utf-8');

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
    framework: 'react',
  };
}
