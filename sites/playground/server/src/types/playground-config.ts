import type { PlaygroundAgentConfig } from '../a2a-tools/index.js';
import type { McpServersConfig } from './mcp-server.js';
import type { PlaygroundSkillConfig } from '../skills/index.js';
import { PlaygroundMode } from '../constants/index.js';

export interface IPlaygroundConfig {
  mcpServers: McpServersConfig;
  framework: string;
  promptList: string[];
  model: string;
  temperature: number;
  agents?: PlaygroundAgentConfig[];
  skills?: PlaygroundSkillConfig[];
  mode?: PlaygroundMode;
}
