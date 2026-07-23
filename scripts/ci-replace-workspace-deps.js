#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const WORKSPACE_PROTOCOL = /^workspace:/;
const DEFAULT_REGISTRY = 'https://registry.npmjs.org';
const REPO_ROOT = path.resolve(__dirname, '..');
const WORKSPACE_ROOTS = ['packages', 'sites', 'docs', 'projects'];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function collectPackageJsonFiles(dir, results = []) {
  if (!fs.existsSync(dir)) {
    return results;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === 'node_modules' || entry.name === 'dist') {
      continue;
    }

    const fullDir = path.join(dir, entry.name);
    const pkgJsonPath = path.join(fullDir, 'package.json');

    if (fs.existsSync(pkgJsonPath)) {
      results.push(pkgJsonPath);
    }

    collectPackageJsonFiles(fullDir, results);
  }

  return results;
}

function loadWorkspacePackageNames() {
  const names = new Set();

  for (const root of WORKSPACE_ROOTS) {
    for (const pkgJsonPath of collectPackageJsonFiles(path.join(REPO_ROOT, root))) {
      const pkg = readJson(pkgJsonPath);
      if (pkg.name) {
        names.add(pkg.name);
      }
    }
  }

  return names;
}

function parseListEnv(name) {
  const value = process.env[name];
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function fetchNpmVersion(packageName, tag, registry = DEFAULT_REGISTRY) {
  const spec = tag === 'latest' ? packageName : `${packageName}@${tag}`;

  try {
    const output = execFileSync('npm', ['view', spec, 'version', '--registry', registry], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();

    const version = output.split('\n').pop().trim().replace(/^"|"$/g, '');
    if (!version) {
      throw new Error('npm view 未返回 version');
    }
    return version;
  } catch (error) {
    const detail = (error.stderr?.toString?.() || error.stdout?.toString?.() || error.message || String(error)).trim();
    if (/404|E404|Not Found|is not in this registry/i.test(detail)) {
      throw new Error(`npm 上未找到 ${packageName}@${tag}`);
    }
    throw new Error(`无法从 npm 读取 ${packageName}@${tag}：${detail}`);
  }
}

function getDependencyFields(pkg) {
  return ['dependencies', 'peerDependencies'].filter(
    (field) => pkg[field] && typeof pkg[field] === 'object',
  );
}

function collectWorkspaceDeps(pkg, workspacePackageNames) {
  const deps = [];

  for (const field of getDependencyFields(pkg)) {
    for (const [depName, versionRange] of Object.entries(pkg[field])) {
      if (!WORKSPACE_PROTOCOL.test(versionRange) || !workspacePackageNames.has(depName)) {
        continue;
      }
      deps.push({ depName, field, versionRange });
    }
  }

  return deps;
}

function resolveDepVersion(depName, publishNames, publishVersion, npmTag) {
  if (publishNames.has(depName) && publishVersion) {
    return { version: publishVersion, source: `同批发布 @ ${publishVersion}` };
  }
  return { version: fetchNpmVersion(depName, npmTag), source: `npm@${npmTag}` };
}

function replaceWorkspaceDeps(pkgPathArg, workspacePackageNames, publishNames, publishVersion, npmTag) {
  const pkgPath = path.resolve(process.cwd(), pkgPathArg);
  if (!fs.existsSync(pkgPath)) {
    throw new Error(`File not found: ${pkgPath}`);
  }

  const pkg = readJson(pkgPath);
  const workspaceDeps = collectWorkspaceDeps(pkg, workspacePackageNames);

  if (workspaceDeps.length === 0) {
    console.log(`${pkgPathArg}：无需替换 workspace 依赖`);
    return;
  }

  const updates = [];

  for (const { depName, field, versionRange } of workspaceDeps) {
    const { version, source } = resolveDepVersion(depName, publishNames, publishVersion, npmTag);
    updates.push({ depName, field, from: versionRange, to: version, source });
    pkg[field][depName] = version;
  }

  for (const item of updates) {
    console.log(`${item.depName}: ${item.from} -> ${item.to} (${item.source})`);
  }

  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
  console.log(`Updated ${pkgPathArg}`);
}

function main() {
  const publishPkgJsons = parseListEnv('PUBLISH_PKG_JSONS');
  const fetchNpmTag = process.env.FETCH_NPM_TAG || 'latest';
  const publishVersion = process.env.PUBLISH_VERSION || '';

  if (publishPkgJsons.length === 0) {
    console.error(`Usage:
  PUBLISH_PKG_JSONS=packages/server/package.json,... node scripts/ci-replace-workspace-deps.js

环境变量:
  PUBLISH_PKG_JSONS   本次发布的 package.json 路径（逗号分隔）
  FETCH_NPM_TAG       从 npm 拉取依赖版本的 tag，默认 latest
  PUBLISH_VERSION     多包同批发布时传入，与 workflow 输入的版本号一致

规则:
  - 依赖也在 PUBLISH_PKG_JSONS 且设置了 PUBLISH_VERSION → 用 PUBLISH_VERSION
  - 其余 workspace 内部依赖 → 从 npm@FETCH_NPM_TAG 拉取（默认 latest）
  - 单包发布时不设 PUBLISH_VERSION，依赖一律走 npm
`);
    process.exit(1);
  }

  try {
    const workspacePackageNames = loadWorkspacePackageNames();
    const publishNames = new Set(
      publishPkgJsons.map((pkgJsonPath) => {
        const pkg = readJson(path.resolve(process.cwd(), pkgJsonPath));
        if (!pkg.name) {
          throw new Error(`${pkgJsonPath} 缺少 name 字段`);
        }
        return pkg.name;
      }),
    );

    for (const pkgJsonPath of publishPkgJsons) {
      replaceWorkspaceDeps(pkgJsonPath, workspacePackageNames, publishNames, publishVersion, fetchNpmTag);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
