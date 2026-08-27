import type { LlmBenchmarkRunOptions } from './framework/types';

export type BenchmarkSuite = 'smoke' | 'nightly' | 'release';

const smokeScenarios = [
  'simple-form',
  'dashboard-card',
  'table-and-filter',
  'form-validation',
  'permission-ui',
  'chart-dashboard-combo',
];

export const benchmarkSuitePresets: Record<BenchmarkSuite, Partial<LlmBenchmarkRunOptions>> = {
  smoke: {
    scenarios: smokeScenarios,
    repeat: 1,
    concurrency: 2,
    failOnProtocol: true,
    llmJudge: { enabled: false },
  },
  nightly: {
    scenarios: undefined,
    repeat: 3,
    concurrency: 2,
    failOnProtocol: false,
    llmJudge: { enabled: false },
  },
  release: {
    scenarios: undefined,
    repeat: 5,
    concurrency: 1,
    failOnProtocol: true,
  },
};

export function resolveBenchmarkSuite(value: unknown): BenchmarkSuite | undefined {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return normalized === 'smoke' || normalized === 'nightly' || normalized === 'release' ? normalized : undefined;
}
