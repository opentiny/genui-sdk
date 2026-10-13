import { cp, mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(__dirname, '..');
const docsRoot = path.resolve(skillRoot, '../../../../docs/src');

const docsExamples = path.join(docsRoot, 'examples');
const examplesTarget = path.join(skillRoot, 'examples');

const docsMaterials = path.join(docsRoot, 'components/materials');
const materialsTarget = path.join(skillRoot, 'references/materials');
const MATERIALS_PRESERVED = new Set(['index.md']);

const DOCS_GUIDES_ROOT = path.join(docsRoot, 'guide');
const docsGuides = [
  { source: path.join(docsRoot, 'guide/quick-start.md'), output: 'quick-start.md' },
  { source: path.join(docsRoot, 'guide/start-with-renderer.md'), output: 'start-with-renderer.md' },
  { source: path.join(docsRoot, 'guide/angular/install.md'), output: 'angular-install.md' },
  { source: path.join(docsRoot, 'guide/angular/start-with-renderer.md'), output: 'angular-start-with-renderer.md' },
  { source: path.join(docsRoot, 'guide/react/install.md'), output: 'react-install.md' },
  { source: path.join(docsRoot, 'guide/react/start-with-renderer.md'), output: 'react-start-with-renderer.md' },
  { source: path.join(docsRoot, 'components/core/api.md'), output: 'core-api.md' },
  { source: path.join(docsRoot, 'components/chat.md'), output: 'component-chat.md' },
  { source: path.join(docsRoot, 'components/renderer.md'), output: 'component-renderer.md' },
  { source: path.join(docsRoot, 'components/code-generator.md'), output: 'component-code-generator.md' },
  { source: path.join(docsRoot, 'components/angular/renderer.md'), output: 'component-angular-renderer.md' },
  { source: path.join(docsRoot, 'components/angular/config-provider.md'), output: 'component-angular-config-provider.md' },
  { source: path.join(docsRoot, 'components/react/renderer.md'), output: 'component-react-renderer.md' },
  { source: path.join(docsRoot, 'components/react/config-provider.md'), output: 'component-react-config-provider.md' },
];
const guidesTarget = path.join(skillRoot, 'references/guides');

async function assertDirExists(dir, label) {
  const info = await stat(dir);
  if (!info.isDirectory()) {
    throw new Error(`${label} is not a directory: ${dir}`);
  }
}

// examples/ 构建时从 docs 同步，docs 内指向组件页 / 主题页的相对链接在此改写为
// skill 内可解析的相对路径；无法本地化的改为在线绝对 URL。
function rewriteExampleLinks(content) {
  return content
    .replaceAll('](../components/materials/theme)', '](../references/guides/core-api.md#imaterialstheme)')
    .replaceAll('](../../components/core/api)', '](../references/guides/core-api.md)')
    .replaceAll('](./renderer/required-complete-field-selectors)', '](./renderer/required-complete-field-selectors.md)')
    .replaceAll('](../../renderer/required-complete-field-selectors)', '](../../renderer/required-complete-field-selectors.md)')
    .replaceAll(/^\!\[[^\]]*\]\(\.\.\/\.\.\/public\/[^)]+\)\s*$/gm, '');
}

// references/materials/ 专页构建时从 docs 同步，core API 类型定义链接指向 vendored guide。
function rewriteMaterialLinks(content) {
  return content
    .replaceAll('](../core/api#imaterials)', '](../guides/core-api.md#imaterials)')
    .replaceAll('](../core/api#imaterialsmeta)', '](../guides/core-api.md#imaterialsmeta)')
    .replaceAll('](../core/api#genprompt)', '](../guides/core-api.md#genprompt)')
    .replaceAll('](../config-provider#materials)', '](../vue.md)')
    .replaceAll('](../config-provider#theme)', '](../../examples/config-provider/theme.md)')
    .replaceAll('](./theme)', '](../guides/core-api.md#imaterialstheme)');
}

// guides 内容构建时从 docs 同步。docs 使用 VitePress 扩展语法（tabs / tip 容器、
// [!code] 高亮标注、截图图片），skill 内为纯 markdown 阅读场景，在此统一清理。
function cleanVitePressSyntax(content) {
  const lines = content.split('\n');
  const cleaned = [];
  let inTabs = false;
  let inTip = false;

  for (const line of lines) {
    if (line.trim() === '::: tabs') {
      inTabs = true;
      continue;
    }
    if (inTabs && line.trim() === ':::') {
      inTabs = false;
      continue;
    }
    if (inTabs) {
      // `== npm` → `**npm**`，作为包管理器分段标签；其余行（代码块等）照常保留
      const tabLabel = line.match(/^==\s+(.+)$/);
      if (!tabLabel) {
        cleaned.push(line);
      } else {
        if (cleaned.length > 0 && cleaned[cleaned.length - 1].trim() !== '') cleaned.push('');
        cleaned.push(`**${tabLabel[1].trim()}**`);
      }
      continue;
    }

    if (/^:::\s+(?:tip|warning)/.test(line)) {
      inTip = true;
      const title = line.replace(/^:::\s+(?:tip|warning)\s*/, '').trim();
      cleaned.push(`> **${title || '提示'}**`);
      continue;
    }
    if (inTip && line.trim() === ':::') {
      inTip = false;
      continue;
    }
    if (inTip) {
      cleaned.push(line.trim() === '' ? '>' : `> ${line}`);
      continue;
    }

    // [!code ++] / [!code --] 高亮标注 → 普通注释文字
    cleaned.push(line.replaceAll('[!code ++]', '追加').replaceAll('[!code --]', '移除'));
  }

  return cleaned
    .join('\n')
    // 截图等 docs 站内静态资源在 skill 内不可用，整行移除
    .replace(/^\!\[[^\]]*\]\([^)]*\/public\/[^)]+\)\s*$/gm, '');
}

// guide 与组件 API 页内容构建时从 docs 同步。链接重写：
// - Legacy 兼容说明已内联进 references/vue.md 与 references/angular.md
// - examples 与 guides 位于同一相对深度（../../examples / 相邻 ./component-*.md）
// - 组件 API 页已全部 vendor（component-*.md），互链本地化
function rewriteGuideLinks(content, outputName) {
  let result = content
    .replaceAll('](../components/chat#兼容组件-genuilegacychat)', '](../vue.md#兼容组件)')
    .replaceAll('](../components/renderer#兼容组件-genuilegacyrenderer)', '](../vue.md#兼容组件)')
    .replaceAll('](../../components/angular/renderer#兼容组件-genuilegacyrenderer)', '](../angular.md#兼容组件)')
    // 组件 API 页间互链（docs 内 ../components/x → skill 内 ./component-x.md）
    .replaceAll('](../components/chat)', '](./component-chat.md)')
    .replaceAll('](../components/renderer)', '](./component-renderer.md)')
    .replaceAll('](../components/code-generator)', '](./component-code-generator.md)')
    .replaceAll('](../../components/angular/config-provider#notify)', '](./component-angular-config-provider.md#notify)')
    .replaceAll('](../../components/angular/renderer)', '](./component-angular-renderer.md)')
    .replaceAll('](../../components/react/renderer)', '](./component-react-renderer.md)')
    .replaceAll('](../../components/react/config-provider)', '](./component-react-config-provider.md)')
    .replaceAll('](./config-provider)', '](./component-react-config-provider.md)')
    // react guide 内指向物料专页的链接，本地化到 skill 的 references/materials/
    .replaceAll('](../../components/materials/react-antd)', '](../materials/react-antd.md)')
    .replaceAll(/(\]\((?:\.\.\/)+examples\/([^)#]+))(?:#[^)]*)?\)/g, '](../../examples/$2.md)')
    .replaceAll(/^\!\[[^\]]*\]\([^)]*\/public\/[^)]+\)\s*$/gm, '');

  // docs 内的裸文件名链接（同目录页面），按产物文件名重定向
  if (outputName === 'quick-start.md') {
    result = result.replaceAll('](start-with-renderer)', '](./start-with-renderer.md)');
  }
  if (outputName === 'angular-install.md') {
    result = result.replaceAll('](start-with-renderer)', '](./angular-start-with-renderer.md)');
  }
  if (outputName === 'react-install.md') {
    result = result.replaceAll('](start-with-renderer)', '](./react-start-with-renderer.md)');
  }
  if (outputName === 'react-start-with-renderer.md') {
    result = result.replaceAll('](install)', '](./react-install.md)');
  }

  return result;
}

// core API 页仅需补 examples 相对链接的 .md 后缀
function rewriteCoreApiLinks(content) {
  return content.replaceAll('](../../examples/renderer/required-complete-field-selectors)', '](../../examples/renderer/required-complete-field-selectors.md)');
}

await assertDirExists(docsExamples, 'docs examples');

const examplesTmp = path.join(skillRoot, 'examples.__build_tmp__');
await rm(examplesTmp, { recursive: true, force: true });

try {
  await cp(docsExamples, examplesTmp, { recursive: true });
  await rewriteMarkdownFiles(examplesTmp, rewriteExampleLinks);
  await rm(examplesTarget, { recursive: true, force: true });
  await rename(examplesTmp, examplesTarget);
} catch (error) {
  await rm(examplesTmp, { recursive: true, force: true });
  throw error;
}

console.log(`Copied examples from ${docsExamples} to ${examplesTarget}`);

await assertDirExists(docsMaterials, 'docs materials');

const materialsTmp = path.join(skillRoot, 'references/materials.__build_tmp__');
await rm(materialsTmp, { recursive: true, force: true });
await mkdir(materialsTmp, { recursive: true });

try {
  const materialFiles = (await readdir(docsMaterials)).filter((file) => file.endsWith('.md'));
  for (const file of materialFiles) {
    const content = rewriteMaterialLinks(await readFile(path.join(docsMaterials, file), 'utf8'));
    await writeFile(path.join(materialsTmp, file), content);
  }

  await mkdir(materialsTarget, { recursive: true });
  for (const file of await readdir(materialsTarget)) {
    if (!MATERIALS_PRESERVED.has(file)) {
      await rm(path.join(materialsTarget, file), { recursive: true, force: true });
    }
  }
  for (const file of materialFiles) {
    await cp(path.join(materialsTmp, file), path.join(materialsTarget, file));
  }

  console.log(`Copied ${materialFiles.length} material docs from ${docsMaterials} to ${materialsTarget}`);
} finally {
  await rm(materialsTmp, { recursive: true, force: true });
}

await assertDirExists(DOCS_GUIDES_ROOT, 'docs guides');
for (const guide of docsGuides) {
  await stat(guide.source);
}

const guidesTmp = path.join(skillRoot, 'references/guides.__build_tmp__');
await rm(guidesTmp, { recursive: true, force: true });
await mkdir(guidesTmp, { recursive: true });

try {
  for (const guide of docsGuides) {
    const raw = await readFile(guide.source, 'utf8');
    const isCoreApi = guide.output === 'core-api.md';
    const content = isCoreApi
      ? rewriteCoreApiLinks(raw)
      : rewriteGuideLinks(cleanVitePressSyntax(raw), guide.output);
    await writeFile(path.join(guidesTmp, guide.output), content);
  }
  // 组件 API 页额外清理：docs 内指向 guide 的相对链接（如快速开始按需引入）本地化
  await rewriteMarkdownFiles(path.join(guidesTmp, '.'), (content) =>
    content
      .replaceAll('](../guide/quick-start#按需引入)', '](./quick-start.md#按需引入)')
      .replaceAll('](../../guide/angular/install#物料配置)', '](./angular-install.md#物料配置)')
      .replaceAll('](../../guide/react/install#按需引入)', '](./react-install.md#按需引入)')
      .replaceAll('](../../guide/react/install#物料配置)', '](./react-install.md#物料配置)')
      // 组件页指向物料专页的链接，本地化到 skill 的 references/materials/
      .replaceAll('](../materials/react-antd)', '](../materials/react-antd.md)'),
  );

  await rm(guidesTarget, { recursive: true, force: true });
  await rename(guidesTmp, guidesTarget);

  console.log(`Copied ${docsGuides.length} guides & component pages from ${DOCS_GUIDES_ROOT} to ${guidesTarget}`);
} catch (error) {
  await rm(guidesTmp, { recursive: true, force: true });
  throw error;
}

async function rewriteMarkdownFiles(dir, rewrite) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await rewriteMarkdownFiles(fullPath, rewrite);
    } else if (entry.name.endsWith('.md')) {
      await writeFile(fullPath, rewrite(await readFile(fullPath, 'utf8')));
    }
  }
}
