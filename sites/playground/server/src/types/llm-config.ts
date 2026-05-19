import type { LanguageModel } from 'ai';
import type { McpServersConfig } from './mcp-server.js';
import type { PlaygroundSkillConfig } from '../skills/index.js';
import type { ProviderConfig } from '../ai-sdk-providers.js';

export type LLMConfigParams = {
  model?: string;
  temperature?: number;
  prompt?: string;
  mcpServers?: McpServersConfig;
  skills?: PlaygroundSkillConfig[];
};

export type LLMConfig = Omit<LLMConfigParams, 'model'> & {
  model?: LanguageModel;
  provider?: ProviderConfig;
  supportJsonFormat?: boolean;
  specificPrompt?: string;
  extraBody?: Record<string, unknown>;
};
