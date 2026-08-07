import { cp, mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(__dirname, '..');
const docsRoot = path.resolve(skillRoot, '../../../../docs/src');
const DOCS_COMPONENTS_BASE = 'https://docs.opentiny.design/genui-sdk/components';

const docsExamples = path.join(docsRoot, 'examples');
const examplesTarget = path.join(skillRoot, 'examples');

const docsMaterials = path.join(docsRoot, 'components/materials');
const materialsTarget = path.join(skillRoot, 'references/materials');

async function assertDirExists(dir, label) {
  const info = await stat(dir);
  if (!info.isDirectory()) {
    throw new Error(`${label} is not a directory: ${dir}`);
  }
}

function rewriteMaterialLinks(content) {
  return content
    .replaceAll('](../core/api#imaterials)', `](${DOCS_COMPONENTS_BASE}/core/api#imaterials)`)
    .replaceAll('](../core/api#imaterialsmeta)', `](${DOCS_COMPONENTS_BASE}/core/api#imaterialsmeta)`)
    .replaceAll('](../core/api#genprompt)', `](${DOCS_COMPONENTS_BASE}/core/api#genprompt)`)
    .replaceAll('](../config-provider#materials)', '](../vue.md)');
}

await assertDirExists(docsExamples, 'docs examples');

const examplesTmp = path.join(skillRoot, 'examples.__build_tmp__');
await rm(examplesTmp, { recursive: true, force: true });

try {
  await cp(docsExamples, examplesTmp, { recursive: true });
  await rm(examplesTarget, { recursive: true, force: true });
  await rename(examplesTmp, examplesTarget);
} catch (error) {
  await rm(examplesTmp, { recursive: true, force: true });
  throw error;
}

console.log(`Copied examples from ${docsExamples} to ${examplesTarget}`);

await assertDirExists(docsMaterials, 'docs materials');
await mkdir(materialsTarget, { recursive: true });
const materialFiles = (await readdir(docsMaterials)).filter((file) => file.endsWith('.md'));
for (const file of materialFiles) {
  const source = path.join(docsMaterials, file);
  const content = rewriteMaterialLinks(await readFile(source, 'utf8'));
  await writeFile(path.join(materialsTarget, file), content);
}
console.log(`Copied ${materialFiles.length} material docs from ${docsMaterials} to ${materialsTarget}`);
