#!/usr/bin/env node

import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function collectMarkdownFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(fullPath)));
    } else if (entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

function extractLinkTargets(content) {
  const targets = [];
  const linkPattern = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let match;
  while ((match = linkPattern.exec(content)) !== null) {
    targets.push({ target: match[1], index: match.index });
  }
  const defPattern = /^\s{0,3}\[([^\]]+)\]:\s*(?:<([^>]*)>|(\S+))(?:\s+"[^"]*")?\s*$/gm;
  while ((match = defPattern.exec(content)) !== null) {
    const target = match[2] ?? match[3];
    if (target) {
      targets.push({ target, index: match.index });
    }
  }
  return targets;
}

function lineOf(content, index) {
  return content.slice(0, index).split('\n').length;
}

function maskFencedCode(content) {
  const lines = content.split('\n');
  let inFence = false;
  return lines
    .map((line) => {
      const fence = line.match(/^\s{0,3}(```|~~~)/);
      if (fence) {
        inFence = !inFence;
        return line;
      }
      return inFence ? ' '.repeat(line.length) : line;
    })
    .join('\n');
}

const markdownFiles = await collectMarkdownFiles(skillRoot);
const broken = [];

for (const file of markdownFiles) {
  const content = await readFile(file, 'utf8');
  const masked = maskFencedCode(content);
  for (const { target, index } of extractLinkTargets(masked)) {
    if (target.startsWith('http://') || target.startsWith('https://') || target.startsWith('#')) {
      continue;
    }
    if (target.includes('<')) {
      continue;
    }
    const [linkPath, anchor] = target.split('#');
    if (!linkPath) continue;

    const resolved = path.resolve(path.dirname(file), linkPath);
    const rel = path.relative(skillRoot, resolved);
    if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
      broken.push({ file, line: lineOf(content, index), target });
      continue;
    }
    try {
      const info = await stat(resolved);
      if (!info.isFile() && !info.isDirectory()) {
        broken.push({ file, line: lineOf(content, index), target });
      }
    } catch {
      broken.push({ file, line: lineOf(content, index), target });
    }
    void anchor;
  }
}

if (broken.length > 0) {
  console.error(`发现 ${broken.length} 个失效的相对链接：`);
  for (const { file, line, target } of broken) {
    console.error(`  ${path.relative(skillRoot, file)}:${line}  ${target}`);
  }
  process.exit(1);
}

console.log(`✓ ${markdownFiles.length} 个 markdown 文件的相对链接全部有效`);
