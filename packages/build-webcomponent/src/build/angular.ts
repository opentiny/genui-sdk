import { existsSync, writeFileSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { build, normalizePath } from 'vite';
import { createWebComponentDts } from '../dts';
import { resolvePackageDir, resolvePackageMainEntry } from '../resolve-materials';
import { createWebComponentViteConfig } from '../frameworks/angular/build-config';
import {
  PACKAGE_ROOT,
  createCwdResolverPlugin,
  createEntryCode,
  createResolverPlugin,
  type BuildWebComponentOptions,
  type BuildWebComponentResult,
} from './shared';

/** ngc 预编译产物，模板已编译成 Ivy 指令，运行时不再需要 Angular 编译器 */
const FACTORY_FILE = path.join(PACKAGE_ROOT, 'dist/frameworks/angular/index.js');

/** 包内入口优先，兼容从 npm 安装（dist/index.mjs）与仓库内（output/dist/index.mjs）两种布局 */
function resolveRuntime(cwd: string) {
  if (!existsSync(FACTORY_FILE)) {
    throw new Error(
      `未找到 ${path.relative(PACKAGE_ROOT, FACTORY_FILE)}。当前安装的 @opentiny/genui-sdk-build-webcomponent 可能不完整，请升级到最新版本。`,
    );
  }

  let zone: string;
  try {
    zone = resolvePackageMainEntry('zone.js', cwd);
  } catch {
    throw new Error('无法解析 zone.js。Angular Web Component 默认使用 zone.js 变更检测，请先安装 zone.js。');
  }

  try {
    resolvePackageDir('@angular/core', cwd);
  } catch {
    throw new Error(
      '无法解析 @angular/core。Web Component 会把 Angular 运行时打进产物，请在执行命令的项目里安装 Angular 相关依赖。',
    );
  }

  return {
    factory: FACTORY_FILE,
    core: resolvePackageMainEntry('@opentiny/genui-sdk-core', PACKAGE_ROOT),
    zone,
  };
}

export async function buildAngularWebComponent(options: BuildWebComponentOptions): Promise<BuildWebComponentResult> {
  const runtime = resolveRuntime(process.cwd());
  const jsFile = path.join(options.outDir, `${options.fileName}.js`);
  const dtsFile = path.join(options.outDir, `${options.fileName}.d.ts`);
  const entryFile = path.join(os.tmpdir(), `genui-web-component-angular-${process.pid}-${Date.now()}.mjs`);

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
        // 仓库内 @opentiny/genui-sdk-angular 的入口字段指向构建目录，这里显式指到库产物
        alias: [{ find: /^zone\.js$/, replacement: runtime.zone }],
        // 工厂里 external 的 Angular 运行时与 OpenTiny NG 组件库由使用方项目提供，保证单例
        plugins: [
          createCwdResolverPlugin(
            [process.cwd(), ...options.materials.map((material) => path.dirname(material.entry)), PACKAGE_ROOT],
            [/^@angular(\/|$)/, /^@opentiny\/ng(-|\/|$)/, /^rxjs(\/|$)/, /^tslib$/],
          ),
        ],
        logLevel: options.logLevel ?? 'info',
        minify: options.minify === false ? false : 'esbuild',
        sourcemap: Boolean(options.sourcemap),
        target: 'es2022',
        chunkSizeWarningLimit: 4000,
      }),
    );
  } finally {
    await rm(entryFile, { force: true });
  }

  writeFileSync(dtsFile, createWebComponentDts('angular', Boolean(options.minimalExports)), 'utf-8');

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
    framework: 'angular',
  };
}
