#!/usr/bin/env node
/**
 * 用 Angular 官方编译器（ngc）把 `src/frameworks/angular` 下的工厂组件预编译成
 * `dist/frameworks/angular/index.js`：组件模板在构建期完成编译，使用方不需要 Angular 工具链。
 *
 * `@opentiny/genui-sdk-angular` 由 CLI 的 dependencies 提供，使用方构建时由 linker 处理，
 * 这里只产出普通 ESM，不再内联 SDK。
 *
 * 前置条件：`@opentiny/genui-sdk-angular` 已构建出 `output/dist/index.d.ts`（tsconfig 的 paths 指向它）。
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tsconfig = path.join(pkgRoot, 'src/frameworks/angular/tsconfig.json');
const angularTypes = path.resolve(pkgRoot, '../frameworks/angular/output/dist/index.d.ts');

if (!existsSync(angularTypes)) {
  console.error(`[genui web-component] 缺少 ${angularTypes}。`);
  console.error('请先构建 @opentiny/genui-sdk-angular（pnpm -F @opentiny/genui-sdk-angular build:lib）。');
  process.exit(1);
}

const localBin = path.join(pkgRoot, 'node_modules/.bin', process.platform === 'win32' ? 'ngc.cmd' : 'ngc');
const bin = existsSync(localBin) ? localBin : 'ngc';

try {
  execFileSync(bin, ['-p', tsconfig], { stdio: 'inherit', cwd: pkgRoot });
} catch {
  console.error('[genui web-component] Angular 工厂预编译失败。');
  process.exit(1);
}

const output = path.join(pkgRoot, 'dist/frameworks/angular/index.js');
if (!existsSync(output)) {
  console.error(`[genui web-component] 预编译未生成 ${output}`);
  process.exit(1);
}

console.log(`[genui web-component] Angular 工厂已预编译：${path.relative(pkgRoot, output)}`);
