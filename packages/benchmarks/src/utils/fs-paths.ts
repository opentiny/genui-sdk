import path from 'path';
import { fileURLToPath } from 'url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * 将输入时间转换为北京时间（UTC+8）。
 * @param date 原始时间
 * @returns 北京时间对应的 Date 对象
 */
function toBeijingDate(date: Date) {
  // China mainland is UTC+8 without DST; keep deterministic formatting for folder names.
  return new Date(date.getTime() + 8 * 60 * 60 * 1000);
}

/**
 * 返回输出（报告/本次生成样本）根目录绝对路径。
 * 默认使用包内 `reports/` 目录（该目录应加入 .gitignore）。
 * @param samplesDir 可选自定义目录
 * @returns 输出根目录绝对路径
 */
export function resolveSamplesDir(samplesDir?: string) {
  return samplesDir
    ? path.resolve(samplesDir)
    : path.resolve(currentDir, '../../reports');
}

/**
 * 生成每次运行目录名（北京时间），格式：`yyyy-MM-dd_hh-mm-ss`。
 * @param date 可选时间（默认当前时间）
 * @returns run 目录名
 */
export function formatBeijingRunDirName(date = new Date()) {
  const d = toBeijingDate(date);
  const yyyy = d.getUTCFullYear();
  const MM = String(d.getUTCMonth() + 1).padStart(2, '0');
  const DD = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}-${MM}-${DD}_${hh}-${mm}-${ss}`;
}

/**
 * 生成单个样本文件绝对路径。
 * @param runDir 本次运行目录
 * @param scenario 场景 id
 * @param modelName 文件安全模型名
 * @param runIndex 运行次数（从 1 开始）
 * @returns 样本文件绝对路径
 * @example `${scenario}_${modelName}_${runIndex}.json`
 */
export function getSampleFilePath(runDir: string, scenario: string, modelName: string, runIndex: number) {
  return path.resolve(runDir, `${scenario}_${modelName}_${runIndex}.json`);
}
