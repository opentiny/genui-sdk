import type { IGenPromptCustomConfig } from '@opentiny/genui-sdk-core';
import type { BenchProtocol } from '../protocol/types';

export type { BenchProtocol };

// 内置基准任务定义（id + messages），与落盘后的 {@link LlmBenchmarkSample} 区分
export interface LlmBenchmarkSampleCase {
  id: string;
  messages: LlmBenchmarkMessage[];
}

export interface LlmBenchmarkMessage {
  role: 'user' | 'assistant';
  content: string;
  messages?: LlmBenchmarkMessagePayload[];
  finishInfo?: LlmBenchmarkMessageFinishInfo;
}

export interface LlmBenchmarkMessagePayload {
  type: string;
  content: string;
  id?: string;
  name?: string;
  formatPretty?: boolean;
  status?: string;
}

export interface LlmBenchmarkMessageFinishInfo {
  object?: string;
  model?: string;
  created?: number;
  choices?: Array<{
    index?: number;
    delta?: Record<string, unknown>;
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

/**
 * 生成样本时 system prompt 的配置。
 * 核心为 SDK `genPrompt` 的 `tgCustomConfig`；`specificPrompt` / `userAppendPrompt` 为基准可选附加约束。
 */
export type LlmBenchmarkPromptConfig = {
  tgCustomConfig: IGenPromptCustomConfig;
  specificPrompt: string;
  userAppendPrompt: string;
};

/**
 * LLM-as-a-Judge 配置：用于在报告阶段二次评估生成质量。
 */
export type LlmBenchmarkJudgeConfig = {
  // 是否启用 Judge 评估（默认 false）
  enabled?: boolean;
  // Judge 使用的模型 id；为空时复用主模型（显式 `model`，否则为 `models` 首项）
  model?: string;
  // 覆盖默认 Judge system prompt
  systemPrompt?: string;
};

export interface LlmBenchmarkRunOptions {
  /**
   * 单模型 id，或与 `models` 并存时作为「主模型」元数据（报告、Judge 默认、HTML 展示等）。
   * 可与 `models` 同时省略其一：至少须提供 **非空的 `models`** 或 **非空的 `model`**；入口会在生成前校验。
   */
  model?: string;
  /** 多模型对比：非空时按列表逐模型生成/过滤报告；与 `model` 可只配置其一或并存（并存时常用于指定主模型 + 多模型列表）。 */
  models?: string[];
  /**
   * 协议：`genui`（默认，schemaJson + genRootSchema）或 `a2ui`（`<a2ui-json>` + AJV）。
   * 可用 `BENCH_PROTOCOL` 覆盖。`a2ui` 下忽略 framework / materialsVariant。
   */
  protocol?: BenchProtocol;
  // 决定 genPrompt 使用的物料包 materialsMeta（Vue / Angular）
  framework?: 'Vue' | 'Angular';
  /**
   * 选用 materials 包导出的哪份 meta：`standard` → `materialsMeta`；Vue `mini` → `miniMaterialsMeta`。
   * 勿与样本字段 `promptVariant`（full / plain 空 system 对照）混淆。
   * 可用 `BENCH_MATERIALS_VARIANT` 覆盖。
   */
  materialsVariant?: 'mini' | 'standard';
  // 单场景过滤（兼容旧配置）
  scenario?: string;
  // 多场景过滤（优先级高于 scenario）
  scenarios?: string[];
  /**
   * 为 true 时默认将 `sites/playground/server/maas-models.json` 中全部模型的 `name` 作为多模型列表。
   * 若 `models` 已为非空数组则以 `models` 为准；环境变量 `BENCH_MODELS` 仍可覆盖整表。
   */
  modelsFromMaasManifest?: boolean;
  // 每个场景重复执行次数，最小为 1
  repeat?: number;
  // 样本生成并发度（最小为 1）
  concurrency?: number;
  /**
   * 单次 `streamText` 请求超时（毫秒），超时中止流并记入 `errorMessage`，避免挂死占满 worker。
   * 默认见 `benchmark.config`；可用 `BENCH_STREAM_TIMEOUT_MS` 覆盖，`0` 表示不限制。
   */
  streamTimeoutMs?: number;
  // 生成样本用的 system prompt 配置
  promptConfig: LlmBenchmarkPromptConfig;
  // 报告阶段是否启用 LLM-as-a-Judge 质量评估
  llmJudge?: LlmBenchmarkJudgeConfig;
  /**
   * 是否额外生成对照样本：`system` 为空，仅 user messages（纯文本输出），与完整 system 并列落盘。
   */
  compareEmptySystem?: boolean;
  /**
   * 为 true 时只生成纯文本对照（空 system、`*_plain.json`），不重复生成完整 system 样本。
   * 常与 {@link targetSampleRunDir} 配合，向已有 run 目录追加 plain 文件后与原有 full 数据一起出报告。
   */
  compareEmptySystemPlainOnly?: boolean;
  /**
   * 指定本次样本落盘目录：绝对路径，或相对于「样本根目录」({@link samplesDir} 解析结果) 的子目录名。
   * 设置后不再新建时间戳子目录，便于向已有 run 追加 plain 样本。
   */
  targetSampleRunDir?: string;
  /**
   * 为 true 时若目标样本 `.json` 已存在则跳过模型调用（用于同一 run 目录续跑）。
   * 默认由入口解析：指定了 {@link targetSampleRunDir} 时为 true，否则 false；可用 `BENCH_SKIP_EXISTING_SAMPLES` 覆盖。
   */
  skipExistingSampleFiles?: boolean;
  json?: boolean;
  /**
   * 为 true（默认）时在报告目录写出 `report_<runDir>.xlsx`（`runDir` 为本次输出目录文件夹名；汇总指标 + 原始样本）；可用环境变量 `BENCH_WRITE_EXCEL=false` 关闭。
   */
  writeExcel?: boolean;
  samplesDir?: string;
  outputDir?: string;
  // 本次 benchmark 入口开始时间戳（ms）。
  // 若提供，报告阶段会计算「从开始执行到报告输出」总耗时。
  benchmarkStartedAtMs?: number;
}

export interface LlmBenchmarkResultItem {
  scenario: string;
  /** 完整物料 system 对照；plain = 空 system（仅 user） */
  promptVariant?: 'full' | 'plain';
  runIndex?: number;
  // 样本生成时使用的模型 id（如 deepseek-chat）
  model?: string;
  // 自请求开始到首个可观测输出 token 的毫秒数；未观测到则缺省。
  ttftMs?: number;
  totalMs: number;
  // 自请求开始到输出中首次「可观测 UI」的毫秒数（genui：wrapperComponent；a2ui：`"id":"root"`）；未出现则缺省。
  firstObservableComponentMs?: number;
  // TPOT（Time Per Output Token），ms/token；completionTokens≤1 时无意义，省略
  tpotMs?: number;
  /** 是否抽到协议块（字段名历史兼容：genui=schemaJson 围栏；a2ui=`<a2ui-json>`） */
  isSchemaJsonBlockFound: boolean;
  /** 块内是否为合法 JSON（genui 可经 repairJson；a2ui 严格 parse） */
  isSchemaJsonValidJson: boolean;
  /** 是否通过当前协议校验（genui=genRootSchema；a2ui=AJV） */
  isSchemaJsonValidAgainstProtocol: boolean;
  // schema 协议校验失败原因（如缺失字段路径）
  schemaValidationError?: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  /** 生成 + Judge 合计 token（计费口径；未开 Judge 或未返回 usage 时等于 totalTokens） */
  benchTotalTokens: number;
  rawOutputChars: number;
  // LLM-as-a-Judge 分数（1~10）
  llmJudgeScore?: number;
  // LLM-as-a-Judge 给出的简要原因
  llmJudgeReason?: string;
  // LLM-as-a-Judge 执行报错（如解析失败、API 错误）
  llmJudgeError?: string;
  /** Judge 调用 usage（启用报告阶段 Judge 且 API 返回时有效） */
  llmJudgePromptTokens?: number;
  llmJudgeCompletionTokens?: number;
  llmJudgeTotalTokens?: number;
  errorMessage?: string;
}

/**
 * Excel「明细」工作表列名与列顺序（与 `buildBenchmarkExcelDetailRows` 一致）。
 * 不写入模型输出 / schemaJson；大段内容见 `report.json` 与样本文件。
 */
export interface BenchmarkExcelDetailRow {
  model: string;
  scenario: string;
  runIndex: number;
  totalMs: number;
  /** 对应指标 TPOT（ms/token）；无则空单元格 */
  tpsMs: number | '';
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  llmJudgeScore: number | '';
  llmJudgeReason: string;
  llmJudgeError: string;
  /** Judge 请求输入 token（`LanguageModelUsage.inputTokens`） */
  llmJudgeInputTokens: number | '';
  /** Judge 请求输出 token（`LanguageModelUsage.outputTokens`） */
  llmJudgeOutputTokens: number | '';
  errorMessage: string;
  /** 原始：对照变体 */
  promptVariant: string;
  /** 原始：样本生成时间 ISO 字符串 */
  generatedAt: string;
}

export interface LlmBenchmarkSample {
  scenario: string;
  /** 缺省或 full：完整 system；plain：空 system 对照 */
  promptVariant?: 'full' | 'plain';
  runIndex?: number;
  model: string;
  /** 生成时协议；缺省时报告阶段回退到运行配置 */
  protocol?: BenchProtocol;
  /** 生成时使用的框架；缺省时报告阶段回退到运行配置 */
  framework?: 'Vue' | 'Angular';
  /** 生成时使用的 materials 档位；缺省时报告阶段回退到运行配置 */
  materialsVariant?: 'mini' | 'standard';
  messages: LlmBenchmarkMessage[];
  output: string;
  generatedAt: string;
  metrics: {
    /** 自请求开始到首 token 的毫秒数；未观测到则缺省。 */
    ttftMs?: number;
    totalMs: number;
    /**
     * 自请求开始到首次可观测 UI 的毫秒数（语义同 {@link LlmBenchmarkResultItem} 同名字段）。
     * 旧版样本可能缺省；报告阶段按 0 处理。
     */
    firstObservableComponentMs?: number;
    /** TPOT（Time Per Output Token），ms/token；completionTokens≤1 时省略 */
    tpotMs?: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    promptNoCacheTokens?: number;
    promptCacheReadTokens?: number;
    promptCacheWriteTokens?: number;
    rawOutputChars: number;
    errorMessage?: string;
  };
}
