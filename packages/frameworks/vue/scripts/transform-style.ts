import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const outputPath = join(__dirname, '../output/web-component/genui-renderer.js');

if (!existsSync(outputPath)) {
  console.error(`Build output not found: ${outputPath}`);
  process.exit(1);
}
try {
  let content = readFileSync(outputPath, 'utf-8');
  // 防止与angular的样式冲突
  content = content.replaceAll('--ti', '--tio');
  writeFileSync(outputPath, content, 'utf-8');
} catch (error) {
  console.error('Failed to transform CSS variables:', error);
  process.exit(1);
}
