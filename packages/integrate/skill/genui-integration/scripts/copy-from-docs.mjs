import { cp, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(__dirname, '..');
const docsExamples = path.resolve(skillRoot, '../../../../docs/src/examples');
const target = path.join(skillRoot, 'examples');

await rm(target, { recursive: true, force: true });
await cp(docsExamples, target, { recursive: true });

console.log(`Copied examples from ${docsExamples} to ${target}`);
