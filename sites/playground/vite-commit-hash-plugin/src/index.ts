import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface CommitHashInfo {
  name?: string;
  commitHash: string;
  commitHashShort: string;
  branch?: string | undefined;
  commitDate?: string;
  submodules?: Record<string, {
    commitHash: string;
    commitHashShort: string;
    branch?: string;
  }>
}

interface SubmoduleCommitInfo {
  commitHash: string;
  commitHashShort: string;
  branch?: string;
}

/**
 * 获取git commit hash信息
 */
function getSubmoduleCommitHashInfo(submodulePath: string): CommitHashInfo | null {
  try {
    const commitHash = execSync(`git -C ${submodulePath} rev-parse HEAD`, { encoding: 'utf-8' }).trim();
    const commitHashShort = execSync(`git -C ${submodulePath} rev-parse --short HEAD`, { encoding: 'utf-8' }).trim();
    let branch: string | undefined;
    try {
      branch = execSync(`git -C ${submodulePath} symbolic-ref -q --short HEAD`, { encoding: 'utf-8' }).trim();
    } catch {
      branch = undefined;
    }

    return {
      name: submodulePath,
      commitHash,
      commitHashShort,
      branch,
    };
  } catch (error) {
    return null;
  }
}

/**
 * 获取所有子模块的版本信息
 */
function getSubmodulesVersion(): Record<string, SubmoduleCommitInfo> {
  const submodules: Record<string, SubmoduleCommitInfo> = {};

  try {
    // 获取所有子模块路径
    const submoduleStatus = execSync('git submodule status', { encoding: 'utf-8' }).trim();

    if (!submoduleStatus) {
      return submodules;
    }

    // 解析子模块状态输出
    // 格式: " b752b20 console-poc (remotes/origin/shen/console-next-qrcode-125-gb752b20)"
    const lines = submoduleStatus.split('\n');

    for (const line of lines) {
      // 跳过空行
      if (!line.trim()) continue;

      // 提取子模块路径（通常在 commit hash 之后）
      // 用例: " b752b20 console-poc" -> 匹配并捕获 "console-poc"
      // 用例: "+abc123 submodule/path" -> 匹配并捕获 "submodule/path"
      // 用例: "-def456 another-module" -> 匹配并捕获 "another-module"
      const regex = /^\s*[+-]?[a-f0-9]+\s+([^\s]+)/;
      const match = line.match(regex);
      if (match && match[1]) {
        const submodulePath = match[1];
        const version = getSubmoduleCommitHashInfo(submodulePath);
        if (version) {
          // 使用子模块路径作为键名
          submodules[submodulePath] = {
            commitHash: version.commitHash,
            commitHashShort: version.commitHashShort,
            ...(version.branch !== undefined && { branch: version.branch }),
          };
        }
      }
    }
  } catch (error) {
    console.warn('无法获取子模块版本信息:', error);
  }

  return submodules;
}

/**
 * 获取 git commit 版本信息
 */
function getCommitHashInfo(): CommitHashInfo {
  try {
    const commitHash = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    const commitHashShort = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    const commitDate = execSync('git log -1 --format=%ci', { encoding: 'utf-8' }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();

    // 获取子模块版本信息
    const submodules = getSubmodulesVersion();

    return {
      commitHash,
      commitHashShort,
      commitDate,
      branch,
      ...(Object.keys(submodules).length > 0 && { submodules }),
    };
  } catch (error) {
    console.warn('无法获取 git 版本信息:', error);
    return {
      commitHash: 'unknown',
      commitHashShort: 'unknown',
      commitDate: new Date().toISOString(),
      branch: 'unknown',
    };
  }
}

/**
 * Vite 插件：在构建时获取并导出 git commit 版本
 */
export function viteGitCommitHashPlugin(options?: {
  /**
   * 输出文件名，默认为 'version.json'
   */
  fileName?: string;
}): any {
  const { fileName = 'version.json' } = options || {};
  let outDir = 'dist';
  const plugin = {
    name: 'vite-plugin-git-version',
    enforce: 'pre' as const,
    apply: 'build',
    configResolved(config: any) {
      // 在配置解析后获取 outDir
      outDir = (config.build && config.build.outDir) || 'dist';
    },
    writeBundle() {
      // 在写入 bundle 后直接写入文件到输出目录
      const version = getCommitHashInfo();

      // 获取绝对路径
      const outDirPath = resolve(outDir);

      // 生成 JSON 文件
      const jsonPath = resolve(outDirPath, fileName);
      writeFileSync(jsonPath, JSON.stringify(version, null, 2), 'utf-8');

      console.log(`✓ Git 版本信息已导出到 ${outDirPath} (commit: ${version.commitHashShort}, branch: ${version.branch})`);
    },
  };

  return plugin;
}
