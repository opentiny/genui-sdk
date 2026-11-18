import assert from 'node:assert/strict';
import test from 'node:test';
import type { LlmBenchmarkResultItem } from '../framework/types';
import { buildBenchmarkHealthSummary, classifyBenchmarkFailure } from './health';

function result(overrides: Partial<LlmBenchmarkResultItem> = {}): LlmBenchmarkResultItem {
  return {
    scenario: 'case',
    promptVariant: 'full',
    totalMs: 1,
    isSchemaJsonBlockFound: true,
    isSchemaJsonValidJson: true,
    isSchemaJsonValidAgainstProtocol: true,
    promptTokens: 1,
    completionTokens: 1,
    totalTokens: 2,
    benchTotalTokens: 2,
    rawOutputChars: 1,
    ...overrides,
  };
}

test('classifies failures in stable priority order', () => {
  assert.equal(classifyBenchmarkFailure(result({ requestFailed: true, errorMessage: 'request timed out' })), 'timeout');
  assert.equal(classifyBenchmarkFailure(result({ requestFailed: true })), 'request_error');
  assert.equal(classifyBenchmarkFailure(result({ isSchemaJsonBlockFound: false })), 'no_protocol_block');
  assert.equal(classifyBenchmarkFailure(result({ isSchemaJsonValidJson: false })), 'invalid_json');
  assert.equal(classifyBenchmarkFailure(result({ isSchemaJsonValidAgainstProtocol: false })), 'schema_error');
});

test('reports request, conditional protocol, and end-to-end rates separately', () => {
  const summary = buildBenchmarkHealthSummary([
    result(),
    result({ isSchemaJsonValidAgainstProtocol: false, failureTag: 'schema_error' }),
    result({ requestFailed: true, failureTag: 'request_error' }),
    result({ promptVariant: 'plain', isSchemaJsonBlockFound: false, isSchemaJsonValidJson: false }),
  ]);
  assert.equal(summary.protocolRows, 3);
  assert.equal(summary.requestSuccessRate, 2 / 3);
  assert.equal(summary.protocolPassRateOnSuccess, 1 / 2);
  assert.equal(summary.endToEndSuccessRate, 1 / 3);
  assert.deepEqual(summary.failureByTag, { ok: 1, schema_error: 1, request_error: 1 });
});
