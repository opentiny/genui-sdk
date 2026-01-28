import { readFileSync, writeFileSync } from 'node:fs';
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
  main: packageJson.main.replace('output/', ''),
  types: packageJson.types.replace('output/', ''),
  type: packageJson.type,
  files: packageJson.files,
  dependencies: { ...packageJson.dependencies },
};

// 处理 exports 中的路径，将其中的 "output/" 前缀去掉
const replaceOutputPath = (value: any): any => {
  if (typeof value === 'string') {
    return value.replace('output/', '');
  }
  if (Array.isArray(value)) {
    return value.map(replaceOutputPath);
  }
  if (value && typeof value === 'object') {
    const result: any = {};
    for (const key in value) {
      result[key] = replaceOutputPath(value[key]);
    }
    return result;
  }
  return value;
};

// 处理 exports和bin 中的路径，将其中的 "output/" 前缀去掉
outputPackageJson.exports = replaceOutputPath(packageJson.exports);
outputPackageJson.bin = replaceOutputPath(packageJson.bin);

const outputDir = join(__dirname, '../output');

const outputPackageJsonPath = join(outputDir, 'package.json');
writeFileSync(outputPackageJsonPath, JSON.stringify(outputPackageJson, null, 2) + '\n', 'utf-8');
