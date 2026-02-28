import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJsonPath = join(__dirname, '../package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

// 创建新的 package.json 对象，只包含需要的字段
const outputPackageJson: any = {
  name: packageJson.name,
  version: packageJson.version,
  description: packageJson.description,
  author: packageJson.author,
  license: packageJson.license,
  homepage: packageJson.homepage,
  keywords: packageJson.keywords,
  main: packageJson.main.replace('output/', ''),
  types: packageJson.types.replace('output/', ''),
  type: packageJson.type,
  files: packageJson.files,
  dependencies: { ...packageJson.dependencies },
};

// 修改 @opentiny/genui-sdk-core 的版本（从 "workspace:*" 改为实际版本号）
if (outputPackageJson.dependencies && outputPackageJson.dependencies['@opentiny/genui-sdk-core'] === 'workspace:*') {
  const corePackageJsonPath = join(__dirname, '../../../core/package.json');
  const corePackageJson = JSON.parse(readFileSync(corePackageJsonPath, 'utf-8'));
  outputPackageJson.dependencies['@opentiny/genui-sdk-core'] = corePackageJson.version;
}


const outputDir = join(__dirname, '../output');

const outputPackageJsonPath = join(outputDir, 'package.json');
writeFileSync(outputPackageJsonPath, JSON.stringify(outputPackageJson, null, 2) + '\n', 'utf-8');

// 复制 packages/server/README.md 到 output 文件夹
const serverReadmePath = join(__dirname, '../README.md');
const outputReadmePath = join(outputDir, 'README.md');
copyFileSync(serverReadmePath, outputReadmePath);
