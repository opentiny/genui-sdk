import assert from 'node:assert/strict';
import test from 'node:test';
import type { LlmBenchmarkSample } from '../framework/types';
import { shouldJudgeSample } from '../run-report';

function sample(overrides: Partial<LlmBenchmarkSample> = {}): LlmBenchmarkSample {
  return {
    scenario: 'case',
    promptVariant: 'full',
    model: 'model',
    protocol: 'genui',
    framework: 'Vue',
    materialsVariant: 'standard',
    messages: [{ role: 'user', content: 'Build a page' }],
    output: '```schemaJson\n{"componentName":"Page","children":[]}\n```',
    generatedAt: new Date(0).toISOString(),
    metrics: {
      totalMs: 1,
      promptTokens: 1,
      completionTokens: 1,
      totalTokens: 2,
      rawOutputChars: 1,
    },
    ...overrides,
  };
}

test('only protocol-valid structured samples are eligible for Judge', () => {
  assert.equal(shouldJudgeSample(sample()), true);
  assert.equal(shouldJudgeSample(sample({ output: 'not schema json' })), false);
  assert.equal(
    shouldJudgeSample(sample({ metrics: { ...sample().metrics, errorMessage: 'request failed' } })),
    false,
  );
  assert.equal(shouldJudgeSample(sample({ promptVariant: 'plain', output: 'plain text' })), false);
});
