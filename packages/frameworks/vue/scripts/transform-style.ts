import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const outputPath = join(__dirname, '../output/web-component/genui-renderer.js');
let content = readFileSync(outputPath, 'utf-8');
content = content.replaceAll('--ti', '--tio');
writeFileSync(outputPath, content, 'utf-8');
