#!/usr/bin/env node

// 校验 skill 内所有 markdown 的站内相对链接指向真实文件。
// 由 `npm run build` 的 postbuild 钩子自动执行（生成物须先落盘），也可独立运行。
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

// 提取 markdown 链接的目标：
// - inline：`[text](target)` 与 `[text](target "title")`
// - 引用式定义：`[label]: target`（可带 `<target>` 与可选 title），由 `[text][label]` / `[text]` 使用
function extractLinkTargets(content) {
  const targets = [];
  const linkPattern = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let match;
  while ((match = linkPattern.exec(content)) !== null) {
    targets.push({ target: match[1], index: match.index });
  }
  // 定义行目标可能被尖括号包裹（CommonMark 引用定义语法）
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

// 将 fenced code 块（``` / ~~~）内容替换为等长空白，避免其中的
// TypeScript 索引签名（`[key: string]: any;`）等被误判为链接或引用定义。
// 替换保长，提取结果的字符偏移在原文中依然有效。
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
