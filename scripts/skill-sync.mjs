#!/usr/bin/env node

import { platform } from 'os';
import { join, isAbsolute, resolve, dirname, relative } from 'path';
import { readFileSync, existsSync, constants } from 'fs';
import {
  cp,
  lstat,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  symlink,
  access,
} from 'fs/promises';

const SYNCABLE_TOOL_IDS = [
  'claude',
  'cursor',
  'gemini',
  'codex',
  'opencode',
  'hermes',
  'openclaw',
];

const DEFAULT_CONFIG = {
  ssotDir: '.agents/skills',
  syncMethod: 'auto',
  enabledTools: ['claude', 'cursor', 'gemini', 'codex', 'opencode', 'hermes', 'openclaw'],
  overrides: {
    claude_config_dir: '.claude',
    cursor_config_dir: '.cursor',
    gemini_config_dir: '.gemini',
    codex_config_dir: '.codex',
    opencode_config_dir: '.config/opencode',
    hermes_config_dir: '.hermes',
    openclaw_config_dir: '.openclaw',
  },
};

const TOOL_REGISTRY = {
  claude: { overrideKey: 'claude_config_dir', defaultConfigRoot: ['.claude'] },
  cursor: { overrideKey: 'cursor_config_dir', defaultConfigRoot: ['.cursor'] },
  gemini: { overrideKey: 'gemini_config_dir', defaultConfigRoot: ['.gemini'] },
  codex: { overrideKey: 'codex_config_dir', defaultConfigRoot: ['.codex'] },
  opencode: { overrideKey: 'opencode_config_dir', defaultConfigRoot: ['.config', 'opencode'] },
  hermes: { overrideKey: 'hermes_config_dir', defaultConfigRoot: ['.hermes'] },
  openclaw: { overrideKey: 'openclaw_config_dir', defaultConfigRoot: ['.openclaw'] },
};

function isPathInside(child, parent) {
  const rel = relative(resolve(parent), resolve(child));
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

function resolveProjectPath(raw, projectRoot, label = 'Path') {
  const trimmed = raw.trim();
  if (trimmed === '~' || trimmed.startsWith('~/') || trimmed.startsWith('~\\')) {
    throw new Error(`${label} must be inside the project (home paths are not allowed): ${raw}`);
  }

  const candidate = isAbsolute(trimmed) ? resolve(trimmed) : resolve(projectRoot, trimmed);
  const resolved = resolve(candidate);
  if (!isPathInside(resolved, projectRoot)) {
    throw new Error(`${label} escapes project root: ${raw} → ${resolved}`);
  }
  return resolved;
}

function resolveOverridePath(raw, projectRoot) {
  return resolveProjectPath(raw, projectRoot, 'Override path');
}

function getOverrideDir(toolId, overrides = {}, projectRoot = process.cwd()) {
  const config = TOOL_REGISTRY[toolId];
  if (!config?.overrideKey) return null;
  const raw = overrides[config.overrideKey]?.trim();
  if (!raw) return null;
  return resolveOverridePath(raw, projectRoot);
}

function getAppSkillsDir(toolId, overrides = {}, projectRoot = process.cwd()) {
  const config = TOOL_REGISTRY[toolId];
  if (!config) throw new Error(`Unknown tool: ${toolId}`);

  const override = getOverrideDir(toolId, overrides, projectRoot);
  if (override) return join(override, 'skills');

  return join(projectRoot, ...config.defaultConfigRoot, 'skills');
}

function resolveSsotDir(ssotDir, projectRoot = process.cwd()) {
  return resolveProjectPath(ssotDir, projectRoot, 'SSOT path');
}

function getAllScanSources(overrides = {}, ssotDir, projectRoot = process.cwd(), enabledTools = []) {
  const sources = enabledTools.map((toolId) => ({
    toolId,
    path: getAppSkillsDir(toolId, overrides, projectRoot),
  }));
  if (ssotDir) sources.push({ toolId: 'ssot', path: ssotDir });
  return sources;
}

function loadConfig(configPath) {
  if (!existsSync(configPath)) {
    console.warn(`Config not found: ${configPath}, using built-in defaults`);
    return DEFAULT_CONFIG;
  }
  return JSON.parse(readFileSync(configPath, 'utf-8'));
}

function resolveConfig(config, projectRoot = process.cwd()) {
  return {
    ssotDir: resolveSsotDir(config.ssotDir ?? DEFAULT_CONFIG.ssotDir, projectRoot),
    syncMethod: config.syncMethod ?? 'auto',
    enabledTools: (config.enabledTools ?? DEFAULT_CONFIG.enabledTools).filter((id) =>
      SYNCABLE_TOOL_IDS.includes(id),
    ),
    overrides: { ...DEFAULT_CONFIG.overrides, ...(config.overrides ?? {}) },
    projectRoot,
  };
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function isSymlink(path) {
  try {
    return (await lstat(path)).isSymbolicLink();
  } catch {
    return false;
  }
}

async function validateSkillSource(source, directory) {
  if (!(await pathExists(source))) {
    throw new Error(`Skill not found in SSOT: ${directory}`);
  }
  try {
    await access(join(source, 'SKILL.md'), constants.F_OK);
  } catch {
    throw new Error(`Skill source missing SKILL.md, refusing sync: ${source}`);
  }
}

async function removePath(path) {
  if (!(await pathExists(path))) return;

  if (await isSymlink(path)) {
    await rm(path, platform() === 'win32' ? { recursive: true } : undefined);
    return;
  }

  const stat = await lstat(path);
  await rm(path, stat.isDirectory() ? { recursive: true } : undefined);
}

async function replaceDestWithCopy(source, dest, directory) {
  await validateSkillSource(source, directory);

  const parent = dirname(dest);
  await mkdir(parent, { recursive: true });

  const safeName = directory.replace(/[^a-zA-Z0-9_-]/g, '_');
  const tmp = join(parent, `.${safeName}.tmp-${process.pid}-${Date.now()}`);

  if (await pathExists(tmp)) await removePath(tmp);

  try {
    await cp(source, tmp, { recursive: true, force: true });
    if (await pathExists(dest)) await removePath(dest);
    await rename(tmp, dest);
  } catch (err) {
    if (await pathExists(tmp)) await removePath(tmp);
    throw err;
  }
}

async function replaceDestWithSymlink(source, dest, directory) {
  const parent = dirname(dest);
  await mkdir(parent, { recursive: true });

  const safeName = directory.replace(/[^a-zA-Z0-9_-]/g, '_');
  const stamp = `${process.pid}-${Date.now()}`;
  const tmp = join(parent, `.${safeName}.link-${stamp}`);
  const bak = join(parent, `.${safeName}.bak-${stamp}`);

  if (await pathExists(tmp)) await removePath(tmp);
  if (await pathExists(bak)) await removePath(bak);

  try {
    await symlink(source, tmp, 'dir');
    const destExists = (await pathExists(dest)) || (await isSymlink(dest));
    if (destExists) await rename(dest, bak);
    try {
      await rename(tmp, dest);
    } catch (err) {
      if (destExists && (await pathExists(bak))) await rename(bak, dest);
      throw err;
    }
    if (await pathExists(bak)) await removePath(bak);
  } catch (err) {
    if (await pathExists(tmp)) await removePath(tmp);
    throw err;
  }
}

async function syncSkillToTool({
  ssotDir,
  directory,
  toolId,
  method,
  overrides = {},
  projectRoot = process.cwd(),
}) {
  const source = join(ssotDir, directory);
  await validateSkillSource(source, directory);

  const appDir = getAppSkillsDir(toolId, overrides, projectRoot);
  await mkdir(appDir, { recursive: true });
  const dest = join(appDir, directory);

  if (method === 'copy') {
    await replaceDestWithCopy(source, dest, directory);
    return { toolId, directory, method: 'copy' };
  }

  if (method === 'symlink') {
    await replaceDestWithSymlink(source, dest, directory);
    return { toolId, directory, method: 'symlink' };
  }

  if ((await pathExists(dest)) && !(await isSymlink(dest))) {
    await replaceDestWithCopy(source, dest, directory);
    return { toolId, directory, method: 'copy', reason: 'dest-not-symlink' };
  }

  if (await isSymlink(dest)) await removePath(dest);

  try {
    await symlink(source, dest, 'dir');
    return { toolId, directory, method: 'symlink' };
  } catch (err) {
    await replaceDestWithCopy(source, dest, directory);
    return { toolId, directory, method: 'copy', reason: 'symlink-fallback', error: err.message };
  }
}

async function syncAllSkills({ ssotDir, enabledTools, syncMethod, overrides, projectRoot }) {
  const directories = await listSkillDirectories(ssotDir);
  const ssotSet = new Set(directories);
  const results = [];

  for (const directory of directories) {
    for (const toolId of enabledTools) {
      try {
        results.push(
          await syncSkillToTool({
            ssotDir,
            directory,
            toolId,
            method: syncMethod,
            overrides,
            projectRoot,
          }),
        );
      } catch (err) {
        results.push({
          toolId,
          directory,
          method: 'error',
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  for (const toolId of enabledTools) {
    const appDir = getAppSkillsDir(toolId, overrides, projectRoot);
    for (const skill of await listSkillEntries(appDir)) {
      if (ssotSet.has(skill.directory)) continue;
      const dest = join(appDir, skill.directory);
      try {
        await removePath(dest);
        results.push({ toolId, directory: skill.directory, method: 'removed' });
      } catch (err) {
        results.push({
          toolId,
          directory: skill.directory,
          method: 'error',
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return results;
}

function parseSkillFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};

  const result = {};
  const lines = match[1].split('\n');

  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i].match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;

    const key = kv[1];
    let value = kv[2].trim();

    if (value === '>-' || value === '|' || value === '>') {
      const folded = [];
      while (
        i + 1 < lines.length &&
        /^(\s|$)/.test(lines[i + 1]) &&
        !/^\w+:/.test(lines[i + 1])
      ) {
        i++;
        folded.push(lines[i].trim());
      }
      value = folded.join(' ').trim();
    } else {
      value = value.replace(/^["']|["']$/g, '');
    }

    if (value) result[key] = value;
  }

  return result;
}

async function listSkillEntries(dirPath) {
  try {
    await access(dirPath, constants.F_OK);
  } catch {
    return [];
  }

  const entries = await readdir(dirPath, { withFileTypes: true });
  const skills = [];

  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    if (entry.name.startsWith('.')) continue;

    const skillPath = join(dirPath, entry.name);
    try {
      await access(join(skillPath, 'SKILL.md'), constants.F_OK);
    } catch {
      continue;
    }

    let name = entry.name;
    let description;

    try {
      const parsed = parseSkillFrontmatter(await readFile(join(skillPath, 'SKILL.md'), 'utf-8'));
      name = parsed.name ?? name;
      description = parsed.description;
    } catch {
      // keep defaults
    }

    skills.push({ directory: entry.name, name, description, path: skillPath });
  }

  return skills;
}

async function listSkillDirectories(ssotDir) {
  return (await listSkillEntries(ssotDir)).map((e) => e.directory);
}

async function scanSkills({
  ssotDir,
  overrides = {},
  projectRoot = process.cwd(),
  enabledTools = [],
}) {
  const sources = getAllScanSources(overrides, ssotDir, projectRoot, enabledTools);
  const ssotSkills = new Set((await listSkillEntries(ssotDir)).map((s) => s.directory));
  const aggregated = new Map();

  for (const { toolId, path } of sources) {
    for (const skill of await listSkillEntries(path)) {
      const existing = aggregated.get(skill.directory);
      if (existing) {
        if (toolId !== 'ssot' && !existing.foundIn.includes(toolId)) {
          existing.foundIn.push(toolId);
        }
        if (!existing.locations.find((l) => l.toolId === toolId)) {
          existing.locations.push({ toolId, path: skill.path });
        }
      } else {
        aggregated.set(skill.directory, {
          directory: skill.directory,
          name: skill.name,
          description: skill.description,
          foundIn: toolId !== 'ssot' ? [toolId] : [],
          inSsot: ssotSkills.has(skill.directory),
          locations: [{ toolId, path: skill.path }],
        });
      }
    }
  }

  return [...aggregated.values()].sort((a, b) => a.directory.localeCompare(b.directory));
}

async function getSyncStatus({ ssotDir, enabledTools, overrides, projectRoot = process.cwd() }) {
  const status = [];

  for (const skill of await listSkillEntries(ssotDir)) {
    const toolStatus = [];

    for (const toolId of enabledTools) {
      const dest = join(getAppSkillsDir(toolId, overrides, projectRoot), skill.directory);
      const exists = await pathExists(dest);
      const symlinked = exists ? await isSymlink(dest) : false;

      toolStatus.push({
        toolId,
        path: dest,
        exists,
        type: !exists ? 'missing' : symlinked ? 'symlink' : 'copy',
      });
    }

    status.push({
      directory: skill.directory,
      name: skill.name,
      ssotPath: skill.path,
      tools: toolStatus,
    });
  }

  return status;
}

function findConfigPath(args) {
  const configIdx = args.indexOf('--config');
  if (configIdx !== -1 && args[configIdx + 1]) return resolve(args[configIdx + 1]);
  return resolve(process.cwd(), 'skills-sync.config.json');
}

function printUsage() {
  console.log(`Usage: node scripts/skill-sync.mjs [command] [options]

Commands:
  (default)  Run scan → sync → status
  all        Same as default
  sync       Sync SSOT skills to AI platform directories
  scan       Scan SSOT and platform directories for skills
  status     Show sync status (symlink/copy/missing) per skill

Options:
  --config <path>   Config file (default: ./skills-sync.config.json)
`);
}

const SUBCOMMANDS = new Set(['scan', 'sync', 'status', 'all']);

function parseCommand(args) {
  const first = args[0];
  if (first === '--help' || first === '-h') return { type: 'help' };
  if (!first || !SUBCOMMANDS.has(first)) return { type: 'run', command: 'all' };
  return { type: 'run', command: first };
}

async function cmdAll(config) {
  await cmdScan(config);
  console.log('');
  await cmdSync(config);
  console.log('');
  await cmdStatus(config);
}

async function cmdSync(config) {
  const results = await syncAllSkills({
    ssotDir: config.ssotDir,
    enabledTools: config.enabledTools,
    syncMethod: config.syncMethod,
    overrides: config.overrides,
    projectRoot: config.projectRoot,
  });

  const failed = results.filter((r) => r.method === 'error');
  const removed = results.filter((r) => r.method === 'removed');
  const synced = results.filter((r) => r.method !== 'error' && r.method !== 'removed');

  console.log(
    `Synced ${synced.length} skill×tool projection(s) (method: ${config.syncMethod}` +
      (removed.length ? `, ${removed.length} removed` : '') +
      (failed.length ? `, ${failed.length} failed` : '') +
      ')',
  );
  for (const r of results) {
    if (r.method === 'error') {
      console.log(`  ✗ ${r.directory} → ${r.toolId} [error] ${r.error}`);
      continue;
    }
    if (r.method === 'removed') {
      console.log(`  − ${r.directory} → ${r.toolId} [removed]`);
      continue;
    }
    const extra = r.reason ? ` (${r.reason})` : '';
    console.log(`  ✓ ${r.directory} → ${r.toolId} [${r.method}]${extra}`);
  }

  if (failed.length) {
    throw new Error(`${failed.length} skill×tool projection(s) failed`);
  }
}

async function cmdScan(config) {
  const results = await scanSkills({
    ssotDir: config.ssotDir,
    overrides: config.overrides,
    projectRoot: config.projectRoot,
    enabledTools: config.enabledTools,
  });

  console.log(`Found ${results.length} skill(s):`);
  for (const s of results) {
    const ssot = s.inSsot ? 'SSOT' : 'external';
    const tools = s.foundIn.length ? s.foundIn.join(', ') : 'none';
    console.log(`  • ${s.directory} (${s.name}) [${ssot}] platforms: ${tools}`);
  }
}

async function cmdStatus(config) {
  const status = await getSyncStatus({
    ssotDir: config.ssotDir,
    enabledTools: config.enabledTools,
    overrides: config.overrides,
    projectRoot: config.projectRoot,
  });

  console.log(`SSOT: ${config.ssotDir}`);
  console.log(`Enabled tools: ${config.enabledTools.join(', ')}`);
  console.log('');

  if (status.length === 0) {
    console.log('No skills in SSOT.');
    return;
  }

  for (const s of status) {
    console.log(`${s.directory} (${s.name})`);
    for (const t of s.tools) {
      const icon = t.type === 'missing' ? '✗' : t.type === 'symlink' ? '↗' : '⎘';
      console.log(`  ${icon} ${t.toolId}: ${t.type} → ${t.path}`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const parsed = parseCommand(args);

  if (parsed.type === 'help') {
    printUsage();
    process.exit(0);
  }

  const configPath = findConfigPath(args);
  const projectRoot = process.cwd();

  let config;
  try {
    config = resolveConfig(loadConfig(configPath), projectRoot);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }

  try {
    switch (parsed.command) {
      case 'all':
        await cmdAll(config);
        break;
      case 'sync':
        await cmdSync(config);
        break;
      case 'scan':
        await cmdScan(config);
        break;
      case 'status':
        await cmdStatus(config);
        break;
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
