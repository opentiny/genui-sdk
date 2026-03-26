import path from 'path';
import { fileURLToPath } from 'url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

function toBeijingDate(date: Date) {
  // China mainland is UTC+8 without DST; keep deterministic formatting for folder names.
  return new Date(date.getTime() + 8 * 60 * 60 * 1000);
}

/**
 * 返回样本目录绝对路径，默认使用包内 samples 目录。
 */
export function resolveSamplesDir(samplesDir?: string) {
  return samplesDir
    ? path.resolve(samplesDir)
    : path.resolve(currentDir, '../../samples');
}

/**
 * 生成每次运行目录名（北京时间），格式：`yyyy-MM-dd_hh-mm-ss`。
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
 * @example `${scenario}_${modelName}_第${runIndex}次运行.json`
 */
export function getSampleFilePath(runDir: string, scenario: string, modelName: string, runIndex: number) {
  return path.resolve(runDir, `${scenario}_${modelName}_第${runIndex}次运行.json`);
}
