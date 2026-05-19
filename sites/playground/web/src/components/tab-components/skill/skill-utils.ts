export type SkillModuleTreeNode = {
  id: string;
  label: string;
  children?: SkillModuleTreeNode[];
};

type InternalNode = {
  label: string;
  id: string;
  children: Map<string, InternalNode>;
  isFile: boolean;
};

export const FRONT_MATTER_BLOCK_REG = /^---\s*\r?\n([\s\S]+?)\s*\r?\n---/;

export const TEXT_EXT = /\.(md|mdx|markdown|txt|json|xml|yaml|yml)$/i;

export const MAIN_SKILL_PATH_REG = /^\.\/[^/]+\/SKILL\.md$/;

const PATH_SEGMENT_CHAR_BLACKLIST = /[/\\:*?"<>|%\u0000-\u001f\u007f\u2028\u2029]/g;

/**
 * 剔除路径非法字符，保留中文等 Unicode。
 */
export function sanitizeDirSegment(name: string): string {
  let s = (name || 'skill').trim().replace(PATH_SEGMENT_CHAR_BLACKLIST, '');
  // 纯点号不宜作为目录段
  if (/^\.+$/.test(s)) {
    s = '';
  }
  return s || 'skill';
}

/**
 * 解析文件夹中的主入口文件（SKILL.md）的概况
 */
export function parseFrontMatterNameDesc(content: string): { name: string; description: string } | null {
  const blockMatch = content.match(FRONT_MATTER_BLOCK_REG);
  if (!blockMatch?.[1]) return null;
  const block = blockMatch[1];
  const nameMatch = block.match(/^name:\s*(.+)$/m);
  const descMatch = block.match(/^description:\s*(.+)$/m);
  const name = nameMatch?.[1]?.trim();
  const description = descMatch?.[1]?.trim();
  return name && description ? { name, description } : null;
}

/**
 * 默认打开的文件路径：优先主入口 ./包名/SKILL.md，否则按路径字典序取第一个
 */
export function preferredSkillModulePath(modules: Record<string, string> | null | undefined): string | null {
  if (!modules || typeof modules !== 'object') return null;
  const mainPaths = Object.keys(modules)
    .filter((p) => MAIN_SKILL_PATH_REG.test(p))
    .sort((a, b) => a.localeCompare(b));
  if (mainPaths.length) return mainPaths[0];
  const keys = Object.keys(modules).sort((a, b) => a.localeCompare(b));
  return keys[0] ?? null;
}

/**
 * 解析文件夹中的主入口文件（SKILL.md）的概况
 */
export function pickMainSkillOverview(modules: Record<string, string>): {
  path: string;
  name: string;
  description: string;
} | null {
  const mainPath = Object.keys(modules).find((p) => MAIN_SKILL_PATH_REG.test(p));
  if (!mainPath) return null;
  const content = modules[mainPath];
  const parsed = parseFrontMatterNameDesc(content);
  if (parsed) {
    return { path: mainPath, name: parsed.name, description: parsed.description };
  }
  const dir = mainPath.split('/')[1] || 'skill';
  return { path: mainPath, name: dir, description: '技能包（请补全 SKILL.md 的 name / description）' };
}

/**
 * 把主包目录段从磁盘文件夹名改成与 front matter `name` 一致的路径段
 */
export function remapModulesByName(
  modules: Record<string, string>,
  overview: { path: string; name: string } | null,
): Record<string, string> {
  if (!overview?.path || !(overview.name || '').trim()) {
    return modules;
  }
  const oldDir = overview.path.match(/^\.\/([^/]+)\//)?.[1];
  if (!oldDir) return modules;
  const newDir = sanitizeDirSegment(overview.name);
  if (oldDir === newDir) {
    return { ...modules };
  }
  const prefix = `./${oldDir}/`;
  const remapped: Record<string, string> = {};
  for (const [key, content] of Object.entries(modules)) {
    const nextKey = key.startsWith(prefix) ? `./${newDir}/${key.slice(prefix.length)}` : key;
    if (nextKey in remapped) {
      console.warn(`Module path collision during remap: ${nextKey}`);
    }
    remapped[nextKey] = content;
  }
  return remapped;
}

/**
 * 将文件夹中的文件与内容转为与JSON对象描述
 */
export async function fileListToSkillModules(
  files: FileList,
): Promise<{ modules: Record<string, string>; skippedFileNum: number }> {
  const all = Array.from(files);
  const list = all.filter((f) => TEXT_EXT.test(f.name));
  const modules: Record<string, string> = {};
  const skippedFileNum = all.length - list.length;

  if (!list.length) return { modules, skippedFileNum };

  for (const file of list) {
    const rel = file.webkitRelativePath.replace(/\\/g, '/');
    const key = rel.startsWith('./') ? rel : `./${rel}`;
    modules[key] = await file.text();
  }
  return { modules, skippedFileNum };
}

/** 单文档保存时归一为 ./目录段/SKILL.md */
export function buildSingleModules(content: string, skillName: string): Record<string, string> {
  const dir = sanitizeDirSegment(skillName || 'skill');
  return { [`./${dir}/SKILL.md`]: content ?? '' };
}

/**
 * 将扁平的 modules 路径（如 ./pkg/SKILL.md）转为 TinyTree 可用的嵌套 data
 */
export function buildTreeDataFromModules(modules: Record<string, string>): SkillModuleTreeNode[] {
  const roots = new Map<string, InternalNode>();

  const paths = Object.keys(modules).sort((a, b) => a.localeCompare(b));

  for (const fullPath of paths) {
    const parts = fullPath.replace(/^\.\//, '').split('/').filter(Boolean);
    if (!parts.length) continue;

    let level = roots;
    let accumulatedPath = '.';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      accumulatedPath = i === 0 ? `./${part}` : `${accumulatedPath}/${part}`;

      let node = level.get(part);
      if (!node) {
        node = {
          label: part,
          id: accumulatedPath,
          children: new Map(),
          isFile: isLast,
        };
        level.set(part, node);
      }

      if (!isLast) {
        level = node.children;
      }
    }
  }

  function toPublicNodes(map: Map<string, InternalNode>): SkillModuleTreeNode[] {
    return [...map.values()]
      .map((n) => {
        if (n.isFile) {
          return { id: n.id, label: n.label };
        }
        const children = toPublicNodes(n.children);
        return { id: n.id, label: n.label, children };
      })
      .sort(compareNodes);
  }

  return toPublicNodes(roots);
}

/**
 * 排序规则：先文件夹、后文件，同级再按文件名排序
 */
function compareNodes(a: SkillModuleTreeNode, b: SkillModuleTreeNode): number {
  const aDir = a.children && a.children.length > 0 ? 0 : 1;
  const bDir = b.children && b.children.length > 0 ? 0 : 1;
  if (aDir !== bDir) return aDir - bDir;
  return a.label.localeCompare(b.label);
}
