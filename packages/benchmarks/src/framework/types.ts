import type { IGenPromptCustomConfig } from '@opentiny/genui-sdk-core';

/** 内置基准任务定义（id + user prompt），与落盘后的 {@link LlmBenchmarkSample} 区分 */
export interface LlmBenchmarkSampleCase {
  id: string;
  prompt: string;
}

/**
 * 生成样本时 system prompt 的配置（与 chat-genui 对齐：genPrompt + specificPrompt + userAppendPrompt）。
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
  /** 是否启用 Judge 评估（默认 false） */
  enabled?: boolean;
  /** Judge 使用的模型 id；为空时默认复用 `model` */
  model?: string;
  /** 覆盖默认 Judge system prompt */
  systemPrompt?: string;
};

export interface LlmBenchmarkRunOptions {
  model: string;
  /** 多模型对比：与 model 二选一或并存；有非空项时优先按列表逐模型生成/过滤报告 */
  models?: string[];
  /** 与 chat-genui 一致，决定 genPrompt 使用的物料 render-config（Vue / Angular） */
  framework?: 'Vue' | 'Angular';
  /** 单场景过滤（兼容旧配置） */
  scenario?: string;
  /** 多场景过滤（优先级高于 scenario） */
  scenarios?: string[];
  /** 每个场景重复执行次数，最小为 1 */
  repeat?: number;
  /** 样本生成并发度（最小为 1） */
  concurrency?: number;
  /** 生成样本用的 system prompt 配置 */
  promptConfig: LlmBenchmarkPromptConfig;
  /** 报告阶段是否启用 LLM-as-a-Judge 质量评估 */
  llmJudge?: LlmBenchmarkJudgeConfig;
  json?: boolean;
  samplesDir?: string;
  outputDir?: string;
}

export interface LlmBenchmarkResultItem {
  scenario: string;
  runIndex?: number;
  /** 样本生成时使用的模型 id（如 deepseek-chat） */
  model?: string;
  ttftMs: number;
  totalMs: number;
  isSchemaJsonBlockFound: boolean;
  isSchemaJsonValidJson: boolean;
  isSchemaJsonValidAgainstProtocol: boolean;
  /** schema 协议校验失败原因（如缺失字段路径） */
  schemaValidationError?: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  rawOutputChars: number;
  /** LLM-as-a-Judge 分数（0~1） */
  llmJudgeScore?: number;
  /** LLM-as-a-Judge 给出的简要原因 */
  llmJudgeReason?: string;
  /** LLM-as-a-Judge 执行报错（如解析失败、API 错误） */
  llmJudgeError?: string;
  errorMessage?: string;
}

export interface LlmBenchmarkSample {
  scenario: string;
  runIndex?: number;
  model: string;
  prompt: string;
  output: string;
  generatedAt: string;
  metrics: {
    ttftMs: number;
    totalMs: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    rawOutputChars: number;
    errorMessage?: string;
  };
}
