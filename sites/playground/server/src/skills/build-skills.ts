import { tool } from 'ai';
import { z } from 'zod';

/** 主 SKILL.md：一级子目录下的 SKILL.md，如 ./test/SKILL.md */
const MAIN_SKILL_PATH_REG = /^\.\/[^/]+\/SKILL\.md$/;

export interface PlaygroundSkillConfig {
  name: string;
  description?: string;
  modules?: Record<string, string>;
}

interface SkillMeta {
  name: string;
  description: string;
}

function hasContent(content: string): boolean {
  return content !== undefined && content !== null;
}

function getSkillMdContent(modules: Record<string, string>, path: string): string | undefined {
  const exactMatch = modules[path];
  if (hasContent(exactMatch)) return exactMatch;

  const suffix = path.replace(/^\.?\//, '/');
  const matchingKey = Object.keys(modules).find((key) => key.endsWith(suffix));
  return hasContent(matchingKey) ? modules[matchingKey] : undefined;
}

/**
 * 按配置顺序生成「可用技能」列表；name / description
 */
function getSkillOverviews(skills: PlaygroundSkillConfig[]): SkillMeta[] {
  const list: SkillMeta[] = [];
  for (const skill of skills) {
    if (!skill) continue;
    if (!skill.modules || !Object.keys(skill.modules).length) continue;

    list.push({
      name: (skill.name || '').trim() || '未命名技能',
      description: (skill.description || '').trim(),
    });
  }
  return list;
}

function resolveSkillModulesByName(
  skills: PlaygroundSkillConfig[],
  skillName: string,
): Record<string, string> | null {
  const key = skillName.trim();
  if (!key) return null;

  for (const skill of skills) {
    if (!skill?.modules || !Object.keys(skill.modules).length) continue;
    if ((skill.name || '').trim() === key) {
      return { ...skill.modules };
    }
  }

  return null;
}

export const formatSkillsForSystemPrompt = (skills: SkillMeta[]): string => {
  if (!skills.length) return '';
  const lines = skills.map((s) => `- **${s.name}**: ${s.description}`);
  return `## 可用技能\n\n${lines.join(
    '\n',
  )}\n\n当需要用到某技能时，请使用 get_skill_content：必须传入上方列表中的技能名称 skillName；若读取子文档再传 path，请同时传 currentPath。`;
};

const SKILL_INPUT_SCHEMA = z.object({
  skillName: z
    .string()
    .min(1)
    .describe('必填。与上方「可用技能」列表中的技能名称一致。'),
  path: z
    .string()
    .optional()
    .describe(
      '要读取的文件相对路径，如 ./reference/inventory.md；不传则返回该技能主 SKILL.md。',
    ),
  currentPath: z
    .string()
    .optional()
    .describe(
      'path 的来源文档路径，例如：在 ./test/reference/inventory.md 中读取到path为 ./detail/inventory-detail.md，则传入 ./test/reference/inventory.md',
    ),
});

export const buildSkillTools = (skills: PlaygroundSkillConfig[] = []) => {
  const hasSkillFiles = skills.some((s) => s?.modules && Object.keys(s.modules).length > 0);

  if (!hasSkillFiles) {
    return {
      tools: {},
      systemPrompt: '',
    };
  }

  const overviews = getSkillOverviews(skills);

  const getSkillContent = tool({
    description:
      '获取某一技能内的文档正文。skillName 必填（与系统提示中列表一致）。可选 path 指定子文件；如果path是从文件中读取的内容，请务必传入读取文件的 currentPath，便于解析出实际路径。',
    inputSchema: SKILL_INPUT_SCHEMA,
    execute: async (args: { skillName: string; path?: string; currentPath?: string }) => {
      const { path: pathArg, skillName, currentPath: currentPathArg } = args;
      let content: string | undefined;
      let resolvedPath = '';

      const modules = resolveSkillModulesByName(skills, skillName);
      if (!modules) {
        return {
          error: '未找到对应技能（请检查 skillName 是否与可用技能列表一致）',
          skillName,
          path: pathArg,
        };
      }

      if (pathArg) {
        let basePathContext = '.';
        if (currentPathArg) {
          const lastSlashIndex = currentPathArg.lastIndexOf('/');
          if (lastSlashIndex >= 0) {
            basePathContext = currentPathArg.slice(0, lastSlashIndex);
          }
        }

        // 解析路径，类似path.join
        const dummyBase = `http://localhost/${basePathContext}/`;
        const url = new URL(pathArg, dummyBase);
        resolvedPath = '.' + url.pathname;
        content = getSkillMdContent(modules, resolvedPath);

        if (content === undefined && (pathArg.startsWith('./') || pathArg.startsWith('../')) && currentPathArg) {
          const normalizedCurrentPath = currentPathArg.replace(/^\.?\//, '');
          const baseParts = normalizedCurrentPath.split('/');
          if (baseParts.length >= 1 && baseParts[0]) {
            const skillRoot = baseParts[0];
            const fallbackDummyBase = `http://localhost/${skillRoot}/`;
            const fallbackUrl = new URL(pathArg, fallbackDummyBase);
            const fallbackPath = '.' + fallbackUrl.pathname;
            const fallbackContent = getSkillMdContent(modules, fallbackPath);
            if (hasContent(fallbackContent)) {
              content = fallbackContent;
              resolvedPath = fallbackPath;
            }
          }
        }

        if (hasContent(content) && !modules[resolvedPath]) {
          const suffix = resolvedPath.replace(/^\.?\//, '/');
          const matchingKey = Object.keys(modules).find((key) => key.endsWith(suffix));
          if (hasContent(matchingKey)) {
            resolvedPath = matchingKey;
          }
        }
      } else {
        let mainPath = Object.keys(modules).find((p) => MAIN_SKILL_PATH_REG.test(p));
        if (!mainPath && Object.keys(modules).length === 1) {
          mainPath = Object.keys(modules)[0];
        }
        if (mainPath) {
          resolvedPath = mainPath;
          content = getSkillMdContent(modules, mainPath);
        }
      }

      if (!hasContent(content)) {
        return {
          error: '未找到对应技能文档',
          skillName,
          path: pathArg,
          providedCurrentPath: currentPathArg,
          attemptedPath: resolvedPath,
        };
      }

      return { content, path: resolvedPath };
    },
  });

  return {
    tools: {
      get_skill_content: getSkillContent,
    },
    systemPrompt: formatSkillsForSystemPrompt(overviews),
  };
};
