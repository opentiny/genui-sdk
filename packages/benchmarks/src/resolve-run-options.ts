import type { BenchProtocol, LlmBenchmarkRunOptions } from './framework/index';
import { benchmarkConfig } from './benchmark.config';
import { resolveBenchProtocol } from './protocol';
import { benchmarkSuitePresets, resolveBenchmarkSuite } from './suites';
import {
  envBenchProtocol,
  envBool,
  envFramework,
  envMaterialsVariant,
  envModelRateLimit,
  envPositiveInt,
  envStreamTimeoutMs,
  envString,
  envStringList,
  listMaasManifestModelNames,
} from './utils';

export type BenchUiFormPayload = {
  model?: string;
  models?: string[];
  modelsFromMaasManifest?: boolean;
  protocol?: BenchProtocol;
  framework?: 'Vue' | 'Angular';
  materialsVariant?: 'mini' | 'standard';
  scenarios?: string[];
  repeat?: number;
  concurrency?: number;
  streamTimeoutMs?: number;
  compareEmptySystem?: boolean;
  compareEmptySystemPlainOnly?: boolean;
  targetSampleRunDir?: string;
  skipExistingSampleFiles?: boolean;
  specificPrompt?: string;
  userAppendPrompt?: string;
  llmJudgeEnabled?: boolean;
  llmJudgeModel?: string;
  llmJudgeSystemPrompt?: string;
  writeExcel?: boolean;
  json?: boolean;
  samplesDir?: string;
  outputDir?: string;
};

/**
 * 运行选项：以 `benchmark.config.ts` 为基准，`.env` 中 `BENCH_*` 覆盖对应项。
 */
export function resolveRunOptions(): LlmBenchmarkRunOptions {
  const suite = resolveBenchmarkSuite(envString('BENCH_SUITE', benchmarkConfig.suite));
  const config = suite ? { ...benchmarkConfig, ...benchmarkSuitePresets[suite] } : benchmarkConfig;
  const {
    model,
    models: configModels,
    modelsFromMaasManifest,
    protocol: defaultProtocol,
    framework,
    materialsVariant: defaultMaterialsVariant,
    scenario,
    scenarios: defaultScenarios,
    repeat,
    concurrency: defaultConcurrency,
    modelRateLimit,
    retry,
    promptConfig,
    llmJudge,
    json,
    samplesDir,
    outputDir,
    compareEmptySystem: defaultCompareEmptySystem,
    compareEmptySystemPlainOnly: defaultPlainOnly,
    targetSampleRunDir: defaultTargetRunDir,
    writeExcel: defaultWriteExcel,
    failOnProtocol,
  } = config;
  const defaultModelsFromManifest =
    configModels && configModels.length > 0
      ? configModels
      : modelsFromMaasManifest || envBool('BENCH_MODELS_FROM_MAAS', false)
        ? listMaasManifestModelNames()
        : undefined;
  const scenarios = envStringList('BENCH_SCENARIOS', defaultScenarios);
  const models = envStringList('BENCH_MODELS', defaultModelsFromManifest);
  const concurrency = envPositiveInt('BENCH_CONCURRENCY', defaultConcurrency ?? 2);
  const modelRateLimitResolved = envModelRateLimit('BENCH_MODEL_RATE_LIMIT', modelRateLimit);
  const retryMaxAttempts = envPositiveInt('BENCH_RETRY_MAX_ATTEMPTS', retry?.maxAttempts ?? 3);
  const judgeEnabled = envBool('BENCH_LLM_JUDGE', llmJudge?.enabled ?? false);
  const judgeModel = envString('BENCH_LLM_JUDGE_MODEL', llmJudge?.model);
  const compareEmptySystem = envBool('BENCH_COMPARE_EMPTY_SYSTEM', defaultCompareEmptySystem ?? false);
  const compareEmptySystemPlainOnly = envBool('BENCH_PLAIN_ONLY', defaultPlainOnly ?? false);
  const targetSampleRunDir = envString('BENCH_TARGET_SAMPLE_RUN_DIR', defaultTargetRunDir);
  const skipExistingDefault = Boolean(targetSampleRunDir);
  const skipExistingSampleFiles = envBool('BENCH_SKIP_EXISTING_SAMPLES', skipExistingDefault);
  const modelRaw = envString('BENCH_MODEL', model);
  const trimmedModel =
    modelRaw === undefined || modelRaw === '' ? undefined : modelRaw.trim() || undefined;
  const streamTimeoutMs = envStreamTimeoutMs('BENCH_STREAM_TIMEOUT_MS', config.streamTimeoutMs);
  return {
    ...(suite ? { suite } : {}),
    ...(trimmedModel ? { model: trimmedModel } : {}),
    models: models && models.length > 0 ? models : undefined,
    protocol: envBenchProtocol('BENCH_PROTOCOL', defaultProtocol ?? 'genui'),
    framework: envFramework('BENCH_FRAMEWORK', framework),
    materialsVariant: envMaterialsVariant('BENCH_MATERIALS_VARIANT', defaultMaterialsVariant),
    scenario: envString('BENCH_SCENARIO', scenario),
    scenarios,
    repeat: envPositiveInt('BENCH_REPEAT', repeat ?? 1),
    concurrency,
    modelRateLimit: modelRateLimitResolved,
    retry: {
      maxAttempts: retryMaxAttempts,
      baseDelayMs: retry?.baseDelayMs,
      maxDelayMs: retry?.maxDelayMs,
    },
    streamTimeoutMs,
    promptConfig,
    compareEmptySystem,
    compareEmptySystemPlainOnly,
    ...(targetSampleRunDir ? { targetSampleRunDir } : {}),
    skipExistingSampleFiles,
    llmJudge: {
      enabled: judgeEnabled,
      model: judgeModel,
      systemPrompt: llmJudge?.systemPrompt,
    },
    failOnProtocol: envBool('BENCH_FAIL_ON_PROTOCOL', failOnProtocol ?? false),
    json: envBool('BENCH_JSON', json ?? false),
    writeExcel: envBool('BENCH_WRITE_EXCEL', defaultWriteExcel ?? true),
    samplesDir: envString('BENCH_SAMPLES_DIR', samplesDir),
    outputDir: envString('BENCH_OUTPUT_DIR', outputDir),
  };
}

function positiveInt(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  return t.length > 0 ? t : undefined;
}

/**
 * 将 UI 表单覆盖到已解析的运行选项上（表单优先）。
 */
export function applyFormPayload(
  base: LlmBenchmarkRunOptions,
  form: BenchUiFormPayload,
): LlmBenchmarkRunOptions {
  const models =
    Array.isArray(form.models) && form.models.length > 0
      ? form.models.map((m) => String(m).trim()).filter(Boolean)
      : undefined;
  const scenarios =
    Array.isArray(form.scenarios) && form.scenarios.length > 0
      ? form.scenarios.map((s) => String(s).trim()).filter(Boolean)
      : undefined;

  let modelsResolved = models;
  if (!modelsResolved?.length && form.modelsFromMaasManifest === true) {
    modelsResolved = listMaasManifestModelNames();
  }

  const model = optionalString(form.model) ?? (!modelsResolved?.length ? base.model : undefined);
  const targetSampleRunDir = optionalString(form.targetSampleRunDir);
  const skipExisting =
    typeof form.skipExistingSampleFiles === 'boolean'
      ? form.skipExistingSampleFiles
      : targetSampleRunDir
        ? true
        : (base.skipExistingSampleFiles ?? false);

  return {
    ...base,
    ...(model ? { model } : { model: undefined }),
    models: modelsResolved && modelsResolved.length > 0 ? modelsResolved : undefined,
    modelsFromMaasManifest: form.modelsFromMaasManifest ?? base.modelsFromMaasManifest,
    protocol: resolveBenchProtocol(form.protocol, base.protocol ?? 'genui'),
    framework:
      form.framework === 'Vue' || form.framework === 'Angular' ? form.framework : base.framework,
    materialsVariant:
      form.materialsVariant === 'mini' || form.materialsVariant === 'standard'
        ? form.materialsVariant
        : base.materialsVariant,
    scenario: undefined,
    scenarios,
    repeat: form.repeat != null ? positiveInt(form.repeat, base.repeat ?? 1) : base.repeat,
    concurrency:
      form.concurrency != null
        ? positiveInt(form.concurrency, base.concurrency ?? 2)
        : base.concurrency,
    streamTimeoutMs:
      form.streamTimeoutMs != null && Number.isFinite(Number(form.streamTimeoutMs))
        ? Math.max(0, Math.floor(Number(form.streamTimeoutMs)))
        : base.streamTimeoutMs,
    compareEmptySystem:
      typeof form.compareEmptySystem === 'boolean'
        ? form.compareEmptySystem
        : base.compareEmptySystem,
    compareEmptySystemPlainOnly:
      typeof form.compareEmptySystemPlainOnly === 'boolean'
        ? form.compareEmptySystemPlainOnly
        : base.compareEmptySystemPlainOnly,
    ...(targetSampleRunDir ? { targetSampleRunDir } : { targetSampleRunDir: undefined }),
    skipExistingSampleFiles: skipExisting,
    promptConfig: {
      ...base.promptConfig,
      specificPrompt:
        typeof form.specificPrompt === 'string' ? form.specificPrompt : base.promptConfig.specificPrompt,
      userAppendPrompt:
        typeof form.userAppendPrompt === 'string'
          ? form.userAppendPrompt
          : base.promptConfig.userAppendPrompt,
    },
    llmJudge: {
      enabled:
        typeof form.llmJudgeEnabled === 'boolean'
          ? form.llmJudgeEnabled
          : (base.llmJudge?.enabled ?? false),
      model: optionalString(form.llmJudgeModel) ?? base.llmJudge?.model,
      systemPrompt: optionalString(form.llmJudgeSystemPrompt) ?? base.llmJudge?.systemPrompt,
    },
    writeExcel: typeof form.writeExcel === 'boolean' ? form.writeExcel : base.writeExcel,
    json: typeof form.json === 'boolean' ? form.json : base.json,
    samplesDir: optionalString(form.samplesDir) ?? base.samplesDir,
    outputDir: optionalString(form.outputDir) ?? base.outputDir,
  };
}

/** 供 UI 预填的可序列化默认值（不含 secrets）。 */
export function toFormDefaults(options: LlmBenchmarkRunOptions): BenchUiFormPayload {
  return {
    model: options.model,
    models: options.models,
    modelsFromMaasManifest: options.modelsFromMaasManifest ?? false,
    protocol: options.protocol ?? 'genui',
    framework: options.framework ?? 'Vue',
    materialsVariant: options.materialsVariant ?? 'standard',
    scenarios: options.scenarios,
    repeat: options.repeat ?? 1,
    concurrency: options.concurrency ?? 5,
    streamTimeoutMs: options.streamTimeoutMs ?? 600_000,
    compareEmptySystem: options.compareEmptySystem ?? false,
    compareEmptySystemPlainOnly: options.compareEmptySystemPlainOnly ?? false,
    targetSampleRunDir: options.targetSampleRunDir,
    skipExistingSampleFiles: options.skipExistingSampleFiles ?? false,
    specificPrompt: options.promptConfig.specificPrompt,
    userAppendPrompt: options.promptConfig.userAppendPrompt,
    llmJudgeEnabled: options.llmJudge?.enabled ?? false,
    llmJudgeModel: options.llmJudge?.model,
    llmJudgeSystemPrompt: options.llmJudge?.systemPrompt,
    writeExcel: options.writeExcel ?? true,
    json: options.json ?? false,
    samplesDir: options.samplesDir,
    outputDir: options.outputDir,
  };
}
