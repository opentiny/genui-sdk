export interface LlmBenchmarkExample {
  id: string;
  prompt: string;
}

export interface LlmBenchmarkRunOptions {
  model: string;
  scenario?: string;
  json?: boolean;
  samplesDir?: string;
  outputDir?: string;
}

export interface LlmBenchmarkResultItem {
  scenario: string;
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
