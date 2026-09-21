/**
 * headless 出码跑法(临时验证工具,不属于出码器本身)。
 *
 * 用法:
 *   node headless/out.cjs                    # 跑 DEMO_SCHEMA
 *   node headless/out.cjs path/to/schema.json
 *   node headless/out.cjs path/to/schema.json --raw   # 关掉 prettier,便于区分是模板还是类体 parse 失败
 */
import { readFileSync } from 'node:fs';
import { AngularCodeGenerator } from '../../index';
import { TINYNG_CONFIG } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/code-generator';
import { DEMO_SCHEMA } from '../demo-schema';

async function main(): Promise<void> {
  const schemaPath = process.argv[2];
  const raw = process.argv.includes('--raw');
  const schema = schemaPath ? JSON.parse(readFileSync(schemaPath, 'utf8')) : DEMO_SCHEMA;

  const result = await new AngularCodeGenerator({ libraries: [TINYNG_CONFIG] }).generate({
    pageInfo: { schema: schema as never, name: 'SchemaCard' },
    formatWithPrettier: !raw,
  });

  process.stdout.write(result.panelValue ?? '');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
