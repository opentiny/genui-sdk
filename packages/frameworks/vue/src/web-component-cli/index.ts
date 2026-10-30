import { statSync } from 'node:fs';
import path from 'node:path';
import { createUsage, parseCliArgs, type WebComponentCliOptions } from './args';
import { buildWebComponent, readPackageVersion } from './build';
import { resolveMaterialsSources } from './resolve-materials';

export * from './args';
export * from './build';
export * from './resolve-materials';

function formatSize(file: string): string {
  try {
    return `${(statSync(file).size / 1024).toFixed(2)} kB`;
  } catch {
    return '未知大小';
  }
}

/**
 * @param argv process.argv.slice(2)
 * @param cwd 物料解析与默认输出目录相对它
 */
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

  console.log('[genui web-component] 待内置物料：');
  for (const material of materials) {
    console.log(`  - ${material.input} -> ${material.entry}`);
  }

  const result = await buildWebComponent({
    materials,
    tagName: options.tagName,
    outDir: options.outDir,
    fileName: options.fileName,
    minify: options.minify,
    sourcemap: options.sourcemap,
  });

  console.log(`\n[genui web-component] 构建完成，注册标签：<${options.tagName}>`);
  for (const file of result.files) {
    console.log(`  - ${path.relative(cwd, file)}  (${formatSize(file)})`);
  }
}
