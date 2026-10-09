/**
 * headless 出码跑法(临时验证工具,不属于出码器本身)。
 *
 * 本入口不进任何构建产物,需要时临时打包一次:
 *   cd packages/frameworks/angular/projects/code-generator
 *   ./node_modules/.bin/esbuild src/headless/entry.ts --bundle --platform=node --format=cjs --outfile=/tmp/cg.cjs
 *
 * 用法:
 *   node /tmp/cg.cjs path/to/schema.json
 *   node /tmp/cg.cjs path/to/schema.json --raw   # 关掉 prettier,便于区分是模板还是类体 parse 失败
 */
import { readFileSync } from 'node:fs';
import { AngularCodeGenerator } from '../../index';
import { TINYNG_CONFIG } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/code-generator';

async function main(): Promise<void> {
  const schemaPath = process.argv[2];
  if (!schemaPath) {
    throw new Error('缺少 schema 路径。用法:node <bundle>.cjs path/to/schema.json [--raw]');
  }

  const raw = process.argv.includes('--raw');
  const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));

  const result = await new AngularCodeGenerator({ materials: [TINYNG_CONFIG] }).generate({
    pageInfo: { schema: schema as never, name: 'SchemaCard' },
    formatWithPrettier: !raw,
  });

  process.stdout.write(result.panelValue ?? '');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
