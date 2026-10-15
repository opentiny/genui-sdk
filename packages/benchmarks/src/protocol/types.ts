export type BenchProtocol = 'genui' | 'a2ui';

export const DEFAULT_BENCH_PROTOCOL: BenchProtocol = 'genui';

export function isBenchProtocol(value: unknown): value is BenchProtocol {
  return value === 'genui' || value === 'a2ui';
}

/** 三层协议门禁结果（字段名沿用 GenUI 历史命名）。 */
export type ProtocolValidationResult = {
  isSchemaJsonBlockFound: boolean;
  isSchemaJsonValidJson: boolean;
  isSchemaJsonValidAgainstProtocol: boolean;
  schemaValidationError?: string;
};
