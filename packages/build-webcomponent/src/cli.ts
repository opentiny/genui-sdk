import { statSync } from 'node:fs';
import path from 'node:path';
import { createUsage, parseCliArgs, type WebComponentCliOptions } from './args';
import { buildWebComponent, readPackageVersion } from './build';
import { resolveMaterialsSources } from './resolve-materials';

function formatSize(file: string): string {
  try {
    return `${(statSync(file).size / 1024).toFixed(2)} kB`;
  } catch {
    return '未知大小';
  }
}

function formatPath(file: string, cwd: string): string {
  const relative = path.relative(cwd, file);
  return relative.startsWith('..') ? file : relative;
}

/** 命令行的完整流程：解析参数 → 解析物料 → 交给对应的框架构建器 → 打印产物 */
export async function runWebComponentBuildCli(argv: string[], cwd = process.cwd()): Promise<void> {
  let options: WebComponentCliOptions;
  try {
    options = parseCliArgs(argv, cwd);
  } catch (error) {
    console.error(`[genui web-component] ${(error as Error).message}\n`);
    console.error(createUsage());
    process.exitCode = 1;
    return;
  }

  if (options.help) {
    console.log(createUsage());
    return;
  }

  if (options.version) {
    console.log(readPackageVersion());
    return;
  }

  let materials;
  try {
    materials = resolveMaterialsSources(options.materials, cwd);
  } catch (error) {
    console.error(`[genui web-component] ${(error as Error).message}\n`);
    console.error(createUsage());
    process.exitCode = 1;
    return;
  }

  console.log(`[genui web-component] 目标框架：${options.framework}`);
  console.log('[genui web-component] 待内置物料：');
  for (const material of materials) {
    console.log(`  - ${material.input} -> ${material.entry}`);
  }

  const result = await buildWebComponent({
    framework: options.framework,
    materials,
    tagName: options.tagName,
    outDir: options.outDir,
    fileName: options.fileName,
    minify: options.minify,
    sourcemap: options.sourcemap,
  });

  const asyncNote = options.framework === 'angular' ? '（注册是异步的）' : '';
  console.log(`\n[genui web-component] 构建完成，注册标签：<${options.tagName}>${asyncNote}`);
  for (const file of result.files) {
    console.log(`  - ${formatPath(file, cwd)}  (${formatSize(file)})`);
  }
}
