import { genPrompt, genRootSchema, repairJson, RepairJsonState } from '@opentiny/genui-sdk-core';
import type { LlmBenchmarkPromptConfig, LlmBenchmarkRunOptions } from '../framework/types';
import {
  describeMissingSchemaJsonFence,
  extractSchemaJsonBlock,
} from '../utils/extract-schema-json';
import { hasWrapperComponentDeclaration } from '../utils/first-observable-component';
import { resolveMaterialsMeta } from '../utils/resolve-materials-meta';
import { hasA2uiFirstObservableMessage } from './a2ui/extract';
import { buildA2uiSystemPrompt } from './a2ui/prompt';
import { validateA2uiOutput } from './a2ui/validate';
import {
  DEFAULT_BENCH_PROTOCOL,
  isBenchProtocol,
  type BenchProtocol,
  type ProtocolValidationResult,
} from './types';

export function resolveBenchProtocol(
  value: unknown,
  fallback: BenchProtocol = DEFAULT_BENCH_PROTOCOL,
): BenchProtocol {
  if (isBenchProtocol(value)) return value;
  if (typeof value === 'string') {
    const t = value.trim().toLowerCase();
    if (isBenchProtocol(t)) return t;
  }
  return fallback;
}

export function protocolFromOptions(options: Pick<LlmBenchmarkRunOptions, 'protocol'>): BenchProtocol {
  return resolveBenchProtocol(options.protocol, DEFAULT_BENCH_PROTOCOL);
}

type FrameworkKey = 'Vue' | 'Angular';
type MaterialsVariant = 'mini' | 'standard';

/**
 * 按协议拼装 system：genui → genPrompt+materials；a2ui → 官方风格 A2UI prompt。
 */
export function buildSystemPromptForProtocol(
  protocol: BenchProtocol,
  framework: FrameworkKey,
  materialsVariant: MaterialsVariant,
  promptConfig: LlmBenchmarkPromptConfig,
): string {
  if (protocol === 'a2ui') {
    return buildA2uiSystemPrompt({
      userAppendPrompt: promptConfig.userAppendPrompt,
    });
  }
  const base = genPrompt(framework, resolveMaterialsMeta(framework, materialsVariant), promptConfig.tgCustomConfig);
  return [base, promptConfig.specificPrompt, promptConfig.userAppendPrompt]
    .filter((s) => s.trim().length > 0)
    .join('\n');
}

function validateGenuiSchemaJson(
  schemaJsonText: string | null,
  componentWhiteList: string[] | undefined,
  sourceOutput: string,
): ProtocolValidationResult {
  if (!schemaJsonText) {
    return {
      isSchemaJsonBlockFound: false,
      isSchemaJsonValidJson: false,
      isSchemaJsonValidAgainstProtocol: false,
      schemaValidationError: describeMissingSchemaJsonFence(sourceOutput),
    };
  }

  const repaired = repairJson(schemaJsonText);
  if (
    repaired.state === RepairJsonState.INVALID_INPUT ||
    repaired.state === RepairJsonState.FAILED ||
    repaired.value === undefined
  ) {
    return {
      isSchemaJsonBlockFound: true,
      isSchemaJsonValidJson: false,
      isSchemaJsonValidAgainstProtocol: false,
      schemaValidationError: `schema JSON repair/parse failed (state=${repaired.state})`,
    };
  }

  const result = genRootSchema(componentWhiteList).safeParse(repaired.value);
  if (result.success) {
    return {
      isSchemaJsonBlockFound: true,
      isSchemaJsonValidJson: true,
      isSchemaJsonValidAgainstProtocol: true,
    };
  }

  const issue = result.error.issues[0];
  const path = issue?.path?.length ? issue.path.join('.') : '(root)';
  const message = issue
    ? `[${issue.code}] ${issue.message}`
    : `schema safeParse failed (issues=${result.error.issues.length})`;
  return {
    isSchemaJsonBlockFound: true,
    isSchemaJsonValidJson: true,
    isSchemaJsonValidAgainstProtocol: false,
    schemaValidationError: `${path}: ${message}`,
  };
}

/**
 * 按协议校验模型完整输出。
 */
export function validateProtocolOutput(
  protocol: BenchProtocol,
  sourceOutput: string,
  options?: {
    framework?: FrameworkKey;
    materialsVariant?: MaterialsVariant;
  },
): ProtocolValidationResult {
  if (protocol === 'a2ui') {
    return validateA2uiOutput(sourceOutput);
  }
  const materialsMeta = resolveMaterialsMeta(
    options?.framework ?? 'Vue',
    options?.materialsVariant ?? 'standard',
  );
  const schemaJsonText = extractSchemaJsonBlock(sourceOutput);
  return validateGenuiSchemaJson(schemaJsonText, materialsMeta.whiteList, sourceOutput);
}

/**
 * 流式「首个可观测 UI」启发式。
 */
export function hasFirstObservableForProtocol(
  protocol: BenchProtocol,
  text: string,
  wrapperComponent: string,
): boolean {
  if (protocol === 'a2ui') {
    return hasA2uiFirstObservableMessage(text);
  }
  return hasWrapperComponentDeclaration(text, wrapperComponent);
}
