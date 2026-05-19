import type { McpServersConfig } from './mcp-server.js';

export type LLMConfigParams = {
  model?: string;
  temperature?: number;
  prompt?: string;
  mcpServers?: McpServersConfig;
};

export type LLMConfig = {
  model?: any; // 支持 AI SDK 模型实例
  temperature?: number;
  apiKey?: string;
  prompt?: string;
  supportJsonFormat?: boolean;
  specificPrompt?: string;
  mcpServers?: McpServersConfig;
};
