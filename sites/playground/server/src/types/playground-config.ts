import type { PlaygroundAgentConfig } from '../a2a-tools/index.js';
import type { OpenApiToolServiceConfig } from '../openapi-tools/types.js';
import type { McpServersConfig } from './mcp-server.js';
import type { PlaygroundSkillConfig } from '../skills/index.js';
export type IMaterialsMetaVariantKey = 'mini' | 'standard';

export type IFrameworkKey = 'Vue' | 'Angular' | 'React';
export interface IPlaygroundConfig {
  mcpServers: McpServersConfig;
  framework: IFrameworkKey;
  promptList: string[];
  model: string;
  temperature: number;
  agents?: PlaygroundAgentConfig[];
  skills?: PlaygroundSkillConfig[];
  openApiTools?: OpenApiToolServiceConfig[];
  promptVariant?: IMaterialsMetaVariantKey;
  componentLib?: 'TinyVue' | 'ElementPlus' | 'TinyNg';
}
