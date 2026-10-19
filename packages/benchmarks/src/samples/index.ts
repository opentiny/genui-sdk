import { basicLlmBenchmarkSampleCases } from './basic';
import { complexLlmBenchmarkSampleCases } from './complex';
import { edgeLlmBenchmarkSampleCases } from './edge';
import { constraintLlmBenchmarkSampleCases } from './constraints';
import { contextualGenuiLlmBenchmarkSampleCases } from './contextual-genui';
import { contextualA2uiLlmBenchmarkSampleCases } from './contextual-a2ui';
import type { BenchProtocol } from '../protocol/types';
import type { LlmBenchmarkSampleCase } from '../framework/types';

export * from './basic';
export * from './complex';
export * from './edge';
export * from './constraints';
export * from './contextual-genui';
export * from './contextual-a2ui';

const sharedCases: LlmBenchmarkSampleCase[] = [
  ...basicLlmBenchmarkSampleCases,
  ...complexLlmBenchmarkSampleCases,
  ...edgeLlmBenchmarkSampleCases,
  ...constraintLlmBenchmarkSampleCases,
];

/** 协议专属 contextual 场景表；新增协议时在此登记。 */
const contextualCasesByProtocol = {
  genui: contextualGenuiLlmBenchmarkSampleCases,
  a2ui: contextualA2uiLlmBenchmarkSampleCases,
} as const satisfies Record<BenchProtocol, readonly LlmBenchmarkSampleCase[]>;

/**
 * 按协议取场景：共享 basic/complex/edge/constraints；contextual 走协议分支。
 */
export function getLlmBenchmarkSampleCases(protocol: BenchProtocol = 'genui'): LlmBenchmarkSampleCase[] {
  return [...sharedCases, ...contextualCasesByProtocol[protocol]];
}

/**
 * @deprecated 默认 genui 注册表；新代码请用 {@link getLlmBenchmarkSampleCases}。
 */
export const coreLlmBenchmarkSampleCases = getLlmBenchmarkSampleCases('genui');
