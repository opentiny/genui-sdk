#!/usr/bin/env node
/** 构建前清空 dist，避免带 hash 的 chunk 和上一次的声明文件残留进发布包 */
import { rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

rmSync(path.join(pkgRoot, 'dist'), { recursive: true, force: true });
