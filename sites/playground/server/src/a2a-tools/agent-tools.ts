import { tool } from 'ai';
import net from 'node:net';
import { z } from 'zod';

export type PlaygroundAgentConfig = {
  // 前端 IAgentConfig 字段（从 playground.metadata 直接透传）
  name: string;
  agentCardUrl: string;
  description?: string;
  enabled?: boolean;

  // Agent Card 解析后在服务端扩展的字段（可选）
  version?: string;
  api?: {
    type?: string;
    url?: string;
    version?: string;
  };
  auth?: {
    type?: string;
    instructions?: string;
  };
  capabilities?: string[];
};

/** 为 Agent 生成稳定的 ASCII tool 名称，只包含 [a-zA-Z0-9_-]。 */
const slugifyAgentName = (name: string, index: number): string => {
  const base = (name || '')
    .trim()
    // 替换非 ASCII 字符为下划线
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    // 去掉头尾的下划线
    .replace(/^_+|_+$/g, '') || 'agent';

  // 加上索引，避免不同 Agent 之间因为名称相同导致冲突
  return `agent_${base}_${index}`;
};

/** 判断 host 是否为本地/内网地址（只做显式阻断，非完整 RFC 覆盖）。 */
const isPrivateOrLocalHost = (host: string): boolean => {
  const lower = host.toLowerCase();

  if (lower === 'localhost' || lower === '127.0.0.1' || lower === '::1') {
    return true;
  }

  const ipVersion = net.isIP(host);
  if (!ipVersion) {
    return false;
  }

  // 仅处理常见的 IPv4 内网网段
  if (ipVersion === 4) {
    const [a, b] = host.split('.').map((v) => Number(v));

    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true; // 链路本地
  }

  // 简单拦截常见的 IPv6 私有地址前缀
  if (ipVersion === 6) {
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
  }

  return false;
};

/** 校验 Agent 的 api.url，仅允许公网 http/https 目标。 */
export const isAllowedAgentUrl = (urlStr: string): boolean => {
  try {
    const u = new URL(urlStr);

    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return false;
    }

    if (isPrivateOrLocalHost(u.hostname)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
};

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
      // 这里使用一个统一的入参结构，由模型选择要交给 Agent 执行的任务内容
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
        const baseUrl = agent.api?.url;

        if (!baseUrl) {
          return {
            type: 'a2a-agent-error',
            message: `Agent "${agent.name}" 未配置 api.url，无法调用`,
          };
        }

        if (!isAllowedAgentUrl(baseUrl)) {
          return {
            type: 'a2a-agent-error',
            message: `Agent "${agent.name}" 的 api.url "${baseUrl}" 不被允许（仅支持公网 http/https，且禁止访问本地/内网地址）。`,
          };
        }

        // 对齐 demo Agent 和 A2A 习惯用法：使用 /tasks 作为任务创建端点
        const taskUrl = `${baseUrl.replace(/\/$/, '')}/tasks`;

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        // 简单支持 bearer / api_key 这两种常见认证方式
        const authType = agent.auth?.type;
        const apiKeyFromMetadata = (args?.metadata && (args.metadata.apiKey || args.metadata.token)) as
          | string
          | undefined;

        if (authType && apiKeyFromMetadata) {
          if (authType.toLowerCase() === 'bearer') {
            headers.Authorization = `Bearer ${apiKeyFromMetadata}`;
          } else if (authType.toLowerCase() === 'api_key' || authType.toLowerCase() === 'api-key') {
            headers['x-api-key'] = apiKeyFromMetadata;
          }
        }

        try {
          const res = await fetch(taskUrl, {
            method: 'POST',
            headers,
            signal: abortSignal,
            body: JSON.stringify({
              input: args?.input ?? '',
              metadata: args?.metadata ?? {},
            }),
          });

          const text = await res.text();

          if (!res.ok) {
            return {
              type: 'agent-function-call-error',
              agent: {
                name: agent.name,
              },
              status: res.status,
              statusText: res.statusText,
              message: text?.trim() || `HTTP ${res.status} ${res.statusText}`.trim(),
            };
          }

          return {
            type: 'text',
            text,
          };
        } catch (error: any) {
          const aborted = error?.name === 'AbortError' || abortSignal?.aborted;
          return {
            type: 'agent-function-call-error',
            agent: {
              name: agent.name,
            },
            message: aborted ? 'Agent request was cancelled' : error?.message || String(error),
          };
        }
      },
    });
  });

  return agentTools;
};
