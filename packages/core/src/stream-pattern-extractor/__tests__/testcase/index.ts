import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prefix = 'testcase/';

function getTestCases() {
  const entries = fs.readdirSync(__dirname, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('case-'))
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }))
    .map((entry) => ({
      fileName: `${prefix}${entry.name}/replay.txt`,
      expectedResultFileName: `${prefix}${entry.name}/out.txt`,
    }));
}

export const testCases = getTestCases();
