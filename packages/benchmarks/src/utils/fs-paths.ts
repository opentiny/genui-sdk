import path from 'path';
import { fileURLToPath } from 'url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * 返回样本目录绝对路径，默认使用包内 samples 目录。
 */
export function resolveSamplesDir(samplesDir?: string) {
  return samplesDir
    ? path.resolve(samplesDir)
    : path.resolve(currentDir, '../../samples');
}

/**
 * 生成单场景样本文件的绝对路径（含模型 slug，便于多模型并存与对比）。
 */
export function getSampleFilePath(baseDir: string, scenario: string, runIndex: number, modelSlug: string) {
  return path.resolve(baseDir, `${scenario}__${modelSlug}__run-${runIndex}.json`);
}
