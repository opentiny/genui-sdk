import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(__dirname, '..');
const docsRoot = path.resolve(skillRoot, '../../../../docs/src');

const docsExamples = path.join(docsRoot, 'examples');
const examplesTarget = path.join(skillRoot, 'examples');

const docsMaterials = path.join(docsRoot, 'components/materials');
const materialsTarget = path.join(skillRoot, 'references/materials');

await rm(examplesTarget, { recursive: true, force: true });
await cp(docsExamples, examplesTarget, { recursive: true });
console.log(`Copied examples from ${docsExamples} to ${examplesTarget}`);

await mkdir(materialsTarget, { recursive: true });
const materialFiles = (await readdir(docsMaterials)).filter((file) => file.endsWith('.md'));
for (const file of materialFiles) {
  await cp(path.join(docsMaterials, file), path.join(materialsTarget, file));
}
console.log(`Copied ${materialFiles.length} material docs from ${docsMaterials} to ${materialsTarget}`);
