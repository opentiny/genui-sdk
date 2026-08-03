#!/usr/bin/env node
import { runSkillGenerateCli } from './cli.js';

const configPath = process.argv[2];

if (!configPath) {
  console.error('用法: genui-skill-generate <config.json>');
  process.exit(1);
}

runSkillGenerateCli(configPath).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
