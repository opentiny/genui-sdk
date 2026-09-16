#!/usr/bin/env node
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createSkillGenerateUsage,
  parseSkillGenerateArgs,
  runSkillGenerateCli,
} from './cli.js';

const defaultConfigPath = resolve(dirname(fileURLToPath(import.meta.url)), '../config.json');

let parsed;

try {
  parsed = parseSkillGenerateArgs(process.argv.slice(2), {
    defaultConfigPath,
    cwd: process.cwd(),
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  console.error(createSkillGenerateUsage());
  process.exit(1);
}

if (parsed.help) {
  console.log(createSkillGenerateUsage());
  process.exit(0);
}

runSkillGenerateCli(parsed.configPath, parsed.options).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
