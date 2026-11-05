#!/usr/bin/env node
import { rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

rmSync(path.join(pkgRoot, 'dist'), { recursive: true, force: true });
