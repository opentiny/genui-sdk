import type { LlmBenchmarkResultItem } from '../framework/types';
import { isPlainPromptVariant } from './comparison-scenario-label';

export type BenchmarkFailureTag =
  | 'ok'
  | 'request_error'
  | 'timeout'
  | 'no_protocol_block'
  | 'invalid_json'
  | 'schema_error';

export interface BenchmarkHealthSummary {
  totalRows: number;
  protocolRows: number;
  requestSuccessfulRows: number;
  protocolPassedRows: number;
  requestSuccessRate: number;
  protocolPassRateOnSuccess: number;
  endToEndSuccessRate: number;
  failureByTag: Partial<Record<BenchmarkFailureTag, number>>;
}

export function classifyBenchmarkFailure(
  item: Pick<
    LlmBenchmarkResultItem,
    | 'requestFailed'
    | 'errorMessage'
    | 'isSchemaJsonBlockFound'
    | 'isSchemaJsonValidJson'
    | 'isSchemaJsonValidAgainstProtocol'
  >,
): BenchmarkFailureTag {
  if (item.requestFailed === true) {
    return /timeout|timed out|abort|deadline/i.test(item.errorMessage ?? '') ? 'timeout' : 'request_error';
  }
  if (!item.isSchemaJsonBlockFound) return 'no_protocol_block';
  if (!item.isSchemaJsonValidJson) return 'invalid_json';
  if (!item.isSchemaJsonValidAgainstProtocol) return 'schema_error';
  return 'ok';
}

export function buildBenchmarkHealthSummary(results: readonly LlmBenchmarkResultItem[]): BenchmarkHealthSummary {
  const protocolRows = results.filter((item) => !isPlainPromptVariant(item));
  const successful = protocolRows.filter((item) => item.requestFailed !== true);
  const passed = successful.filter((item) => item.isSchemaJsonValidAgainstProtocol);
  const failureByTag: BenchmarkHealthSummary['failureByTag'] = {};

  for (const item of protocolRows) {
    const tag = item.failureTag ?? classifyBenchmarkFailure(item);
    failureByTag[tag] = (failureByTag[tag] ?? 0) + 1;
  }

  const rate = (numerator: number, denominator: number) => (denominator === 0 ? 1 : numerator / denominator);
  return {
    totalRows: results.length,
    protocolRows: protocolRows.length,
    requestSuccessfulRows: successful.length,
    protocolPassedRows: passed.length,
    requestSuccessRate: rate(successful.length, protocolRows.length),
    protocolPassRateOnSuccess: rate(passed.length, successful.length),
    endToEndSuccessRate: rate(passed.length, protocolRows.length),
    failureByTag,
  };
}
