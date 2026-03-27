import { basicLlmBenchmarkSampleCases } from './basic';
import { complexLlmBenchmarkSampleCases } from './complex';
import { edgeLlmBenchmarkSampleCases } from './edge';
import { constraintLlmBenchmarkSampleCases } from './constraints';

export * from './basic';
export * from './complex';
export * from './edge';
export * from './constraints';

/**
 * 内置基准场景注册表（用于样本生成/对比）。
 * 统一从 index 作为入口导出，便于后续按类别扩展。
 */
export const coreLlmBenchmarkSampleCases = [
  ...basicLlmBenchmarkSampleCases,
  ...complexLlmBenchmarkSampleCases,
  ...edgeLlmBenchmarkSampleCases,
  ...constraintLlmBenchmarkSampleCases,
];
