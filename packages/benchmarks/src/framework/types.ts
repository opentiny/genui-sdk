/** 内置基准任务定义（id + user prompt），与落盘后的 {@link LlmBenchmarkSample} 区分 */
export interface LlmBenchmarkSampleCase {
  id: string;
  prompt: string;
}

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
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  rawOutputChars: number;
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
