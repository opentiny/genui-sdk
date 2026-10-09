#!/usr/bin/env node

// 校验 skill 内所有 markdown 的站内相对链接指向真实文件。
// 先运行 `npm run build` 生成同步内容，再运行本脚本。
// 外部 URL（http/https）、纯锚点、代码示例中的占位 URL 不在检查范围。

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

// 提取 inline 与引用式 markdown 链接的目标（`[](target)` 与 `[](target "title")`）
function extractLinkTargets(content) {
  const targets = [];
  const linkPattern = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let match;
  while ((match = linkPattern.exec(content)) !== null) {
    targets.push({ target: match[1], index: match.index });
  }
  return targets;
}

function lineOf(content, index) {
  return content.slice(0, index).split('\n').length;
}

const markdownFiles = await collectMarkdownFiles(skillRoot);
const broken = [];

for (const file of markdownFiles) {
  const content = await readFile(file, 'utf8');
  for (const { target, index } of extractLinkTargets(content)) {
    if (target.startsWith('http://') || target.startsWith('https://') || target.startsWith('#')) {
      continue;
    }
    // 代码示例中的占位后端地址等（如 <your-backend-api>）不是文档链接
    if (target.includes('<')) {
      continue;
    }
    const [linkPath, anchor] = target.split('#');
    if (!linkPath) continue; // 纯锚点形式已被上方过滤，防御性跳过

    const resolved = path.resolve(path.dirname(file), linkPath);
    try {
      const info = await stat(resolved);
      if (!info.isFile() && !info.isDirectory()) {
        broken.push({ file, line: lineOf(content, index), target });
      }
    } catch {
      broken.push({ file, line: lineOf(content, index), target });
    }
    void anchor; // 锚点存在性不做校验（VitePress 中文锚点 slug 规则与 github 不同）
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
