import { tool } from 'ai';
import { z } from 'zod';
import type { AgentCard } from '@a2a-js/sdk';

/** 从 A2A SDK 复用的类型：直接导出供外部使用 */
export type { AgentCard } from '@a2a-js/sdk';

/**
 * 兼容 A2A AgentCard 的入参类型：至少包含 name/description/url，其余字段可选；
 * 另支持 headers 用于调用时的鉴权等请求头（非 A2A 规范字段）。
 */
export type A2AAgentCard = Pick<AgentCard, 'name' | 'description' | 'url'> &
  Partial<Omit<AgentCard, 'name' | 'description' | 'url'>> & {
    /** 调用该 agent 时可选请求头（如鉴权），为扩展字段 */
    headers?: Record<string, string>;
  };

/** 将 A2A 规范 agent card 列表转换为 AI SDK 工具（每个 agent 对应一个 tool，调用其 message/send） */
export function agentsToAISdkTools(
  agents: A2AAgentCard[],
  abortSignal?: AbortSignal,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (!agents?.length) return result;

  for (const agent of agents) {
    if (!agent?.name || !agent?.url) continue;
    const toolName = agent.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '_') || `agent_${agent.url}`;
    const uniqueName = result[toolName] ? `${toolName}_${agent.url.replace(/[^a-zA-Z0-9]/g, '_')}` : toolName;
    const agentUrl = agent.url;
    const agentHeaders = agent.headers;
    const agentName = agent.name;

    result[uniqueName] = tool({
      description: agent.description,
      inputSchema: z.object({
        message: z.string().describe('发送给该 agent 的文本消息或任务描述'),
      }),
      execute: async (args: { message: string }) => {
        const message = args.message;
        try {
          const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
          const res = await fetch(agentUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...agentHeaders,
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: messageId,
              method: 'message/send',
              params: {
                message: {
                  role: 'user',
                  messageId,
                  parts: [{ kind: 'text', text: message }],
                },
              },
            }),
            signal: abortSignal ?? undefined,
          });

          if (!res.ok) {
            const errText = await res.text();
            return {
              content: [{ type: 'text', text: `A2A 调用失败 (${res.status}): ${errText}` }],
            };
          }

          const json = (await res.json()) as {
            result?: { artifacts?: Array<{ parts?: Array<{ kind?: string; text?: string }> }> };
            error?: { message?: string };
          };

          if (json.error) {
            return {
              content: [{ type: 'text', text: `A2A 错误: ${json.error.message ?? JSON.stringify(json.error)}` }],
            };
          }

          const parts: Array<{ type: 'text'; text: string }> = [];
          for (const artifact of json.result?.artifacts ?? []) {
            for (const part of artifact.parts ?? []) {
              if (part.kind === 'text' && part.text) parts.push({ type: 'text', text: part.text });
            }
          }
          const text = parts.length ? parts.map((p) => p.text).join('\n') : JSON.stringify(json.result ?? {});
          return { content: [{ type: 'text', text }] };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`Failed to call A2A agent ${agentName}:`, err);
          return {
            content: [{ type: 'text', text: `调用异常: ${message}` }],
          };
        }
      },
    });
  }
  return result;
}
