import { tool } from 'ai';
import { z } from 'zod';
import { invokeA2aAgent } from '../invoke-agent/index.js';
import type { PlaygroundAgentConfig } from '../types.js';

function slugifyAgentName(name: string, index: number): string {
  const base = (name || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'agent';

  return `agent_${base}_${index}`;
}

export const buildAgentTools = (
  agents: PlaygroundAgentConfig[] | undefined,
  abortSignal?: AbortSignal,
): Record<string, any> => {
  const agentTools: Record<string, any> = {};

  if (!Array.isArray(agents) || !agents.length) {
    return agentTools;
  }

  agents.forEach((agent, index) => {
    if (!agent?.name) {
      return;
    }

    const toolName = slugifyAgentName(agent.name, index);

    agentTools[toolName] = tool({
      description:
        agent.description ||
        `调用 A2A Agent "${agent.name}"。该 Agent 通过 A2A 接口提供能力，具体由前端或上游系统处理。`,
      inputSchema: z.object({
        input: z
          .string()
          .describe('要转交给该 Agent 处理的自然语言请求或任务描述'),
        metadata: z
          .record(z.any())
          .optional()
          .describe('可选的附加元数据，将一并发送给 Agent'),
      }),
      execute: async (args: any) => {
        return invokeA2aAgent(agent, args?.input ?? '', args?.metadata ?? {}, abortSignal);
      },
    });
  });

  return agentTools;
};
