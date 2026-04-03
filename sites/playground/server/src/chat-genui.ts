import { type Request, type Response } from 'express';
import { streamText, stepCountIs, tool } from 'ai';
import getRawBody from 'raw-body';
import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { rendererConfig } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/render-config';
import { ngRendererConfig } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/render-config';
import { genPrompt, type IGenPromptCustomConfig } from '@opentiny/genui-sdk-core';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { useProviderModelMapperSync } from './use-provider-mapper.js';
import { openaiCompatibleTransformChunk, type IOpenaiCompatibleChunk } from '@opentiny/genui-sdk-chat-completions';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { JsonSchema } from 'json-schema-to-zod';
import { jsonSchemaToZod } from 'json-schema-to-zod';

type StreamTextOptions = Parameters<typeof streamText>[0];

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
const isAllowedAgentUrl = (urlStr: string): boolean => {
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

export type McpServerConfig = {
  name: string;
  url: string;
  description?: string;
  enabled?: boolean;
  headers?: Record<string, string>;
  timeout?: number;
};

export type McpServer = {
  url: string;
  headers?: Record<string, string>;
  timeout?: number;
  enabled?: boolean;
};

export type McpServersConfig = McpServerConfig[];

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

const initClients = async (
  serverName: string,
  serverConfig: McpServer,
  abortSignal?: AbortSignal,
): Promise<Client | null> => {
  const { timeout, url, headers } = serverConfig;
  const client = new Client({
    name: serverName,
    version: '1.0.0',
  });

  let baseUrl: URL;

  try {
    baseUrl = new URL(url);
  } catch (error) {
    console.error(`Init ${serverName} failed: ${error}`);

    return null;
  }

  try {
    const transport = new StreamableHTTPClientTransport(baseUrl, {
      requestInit: {
        headers,
        signal: abortSignal,
      },
    });
    await client.connect(transport, { timeout });
  } catch (_error) {
    try {
      const sseTransport = new SSEClientTransport(baseUrl, {
        requestInit: {
          headers,
          signal: abortSignal,
        },
      });

      try {
        await client.connect(sseTransport, { timeout });
      } catch (error) {
        console.error(`Init ${serverName} failed: ${error}`);

        return null;
      }
    } catch (error) {
      console.error(`Init ${serverName} failed: ${error}`);

      return null;
    }
  }

  console.info(`Successfully connected to MCP server: ${serverName}`);

  return client;
};

const initMcpServers = async (
  mcpServers: McpServersConfig,
  abortSignal?: AbortSignal,
): Promise<Map<string, Client>> => {
  const clientsMap = new Map<string, Client>();

  const initPromises = mcpServers.map(async (server) => {
    const client = await initClients(server.name, server, abortSignal);
    if (client) {
      clientsMap.set(server.name, client);
    }
    return client;
  });

  await Promise.all(initPromises);

  return clientsMap;
};

export const generateAiSdkTools = async (
  mcpServers: McpServersConfig,
  abortSignal?: AbortSignal,
): Promise<{ tools: Record<string, any>; clientsMap: Map<string, Client> }> => {
  if (!mcpServers.length) {
    return { tools: {}, clientsMap: new Map() };
  }

  const clientsMap = await initMcpServers(mcpServers, abortSignal);
  const allTools: Record<string, any> = {};

  for (const [serverName, client] of clientsMap) {
    try {
      // 获取 MCP 服务器提供的工具列表
      const toolsList: Tool[] = (await client.listTools()).tools;

      for (const mcpTool of toolsList) {
        allTools[mcpTool.name] = tool({
          description: mcpTool.description,
          inputSchema: new Function('z', `return ${jsonSchemaToZod(mcpTool.inputSchema as JsonSchema, { depth: 1 })}`)(
            z,
          ),
          execute: async (args: any) => {
            try {
              // 调用 MCP 工具
              const result = await client.callTool({
                name: mcpTool.name,
                arguments: args,
              });
              return result.content;
            } catch (error) {
              console.error(`Failed to call tool ${mcpTool.name}:`, error);
              return {
                content: [],
                isError: true,
                error: error.message,
              };
            }
          },
        });
      }
      console.log(`Tools for ${serverName}:`, Object.keys(allTools));
    } catch (error) {
      console.error(`Failed to get tools from ${serverName}:`, error);
    }
  }

  return { tools: allTools, clientsMap };
};

export async function generateLlmConfig(llmConfigParams: LLMConfigParams | undefined): Promise<LLMConfig> {
  const providerModelMapper = useProviderModelMapperSync();
  const { model } = llmConfigParams || {};
  const modelInfo = providerModelMapper.getModelInfo(model || '');
  const aiSDKModel = modelInfo ? providerModelMapper.getAiSDKModel(modelInfo) : undefined;

  return {
    ...llmConfigParams,
    ...modelInfo,
    model: aiSDKModel,
    supportJsonFormat: modelInfo?.model.supportJsonFormat || false,
    specificPrompt: modelInfo?.model.specificPrompt || '',
  };
}

type PlaygroundAgentConfig = {
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

const getPlaygroundConfig = (playgroundStr: string) => {
  let playgroundConfig: any = {};

  try {
    playgroundConfig = JSON.parse(playgroundStr);
  } catch (error) {
    console.error('Failed to parse playground from metadata:', error);
  }

  const rawAgents = (playgroundConfig.agents || []) as PlaygroundAgentConfig[];
  // 解析后立刻过滤掉指向本地/内网等不安全目标的 Agent，降低 SSRF 风险
  const agents = rawAgents.filter((agent) => {
    const url = agent.api?.url;
    if (!url) return true;
    return isAllowedAgentUrl(url);
  });

  return {
    mcpServers: playgroundConfig.mcpServers || [],
    framework: playgroundConfig.framework || 'Vue',
    userAppendPrompt: playgroundConfig.promptList?.filter(Boolean).join('\n') || '',
    model: playgroundConfig.model || '',
    temperature: playgroundConfig.temperature || 0.3,
    agents,
  };
};

const buildAgentTools = (
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
  }

  return agentTools;
};

export function createChatGenui() {
  const chatGenuiHandler = async (req: Request, res: Response): Promise<void> => {
    const abort = new AbortController();
    const body = JSON.parse(await getRawBody(req, { encoding: 'utf-8' }));
    if (process.env.CHAT_UI_REPLAY_MODE === 'true') {
      res.setHeader('Content-Type', 'text/event-stream');
      const text = await fs.readFile(path.join(fileURLToPath(import.meta.url), '../replay/replay.txt'), 'utf-8');
      const data = text.split(/\r?\n\r?\n/);

      for await (const item of data) {
        res.write(item.trim() + '\n\n');
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      res.end();
      return;
    }

    const { tinygenui: tinygenuiStr, playground: playgroundStr } = body.metadata || {};

    let tgCustomConfig: IGenPromptCustomConfig = {};

    if (tinygenuiStr) {
      try {
        tgCustomConfig = typeof tinygenuiStr === 'string' ? JSON.parse(tinygenuiStr) : {};
      } catch (error) {
        console.error('Failed to parse tinygenui from metadata:', error);
      }
    }

    const playgroundConfig = getPlaygroundConfig(playgroundStr);
    const { mcpServers, framework, userAppendPrompt, agents } = playgroundConfig;

    const llmConfigParams: LLMConfigParams = {
      model: playgroundConfig.model,
      temperature: playgroundConfig.temperature,
      mcpServers,
    };


    const llmConfig = await generateLlmConfig(llmConfigParams);
    const { model, temperature, specificPrompt } = llmConfig;
    const { tools: mcpTools, clientsMap } = await generateAiSdkTools(
      mcpServers.filter((s) => s.enabled),
      abort.signal,
    );
    const agentTools = buildAgentTools(agents, abort.signal);
    const tools = { ...mcpTools, ...agentTools };

    const renderConfigForFramework = framework === 'Angular' ? ngRendererConfig : rendererConfig;
    const maxSteps = 30;
    let hasError = false; // 标记是否已经处理了错误
    const options: StreamTextOptions = {
      model,
      temperature,
      system: genPrompt(renderConfigForFramework, tgCustomConfig) + '\n' + specificPrompt + '\n' + userAppendPrompt,
      messages: body.messages,
      abortSignal: abort.signal,
      tools,
      toolChoice: 'auto',
      stopWhen: stepCountIs(maxSteps),
      onError: (error: any) => {
        if (hasError) {
          return;
        }
        hasError = true;

        console.error('Error in chat-genui onError:', error);
        const actualError = error?.error?.cause ?? error?.error ?? error;
        const statusCode = actualError?.statusCode ?? 500;
        const responseBody = actualError?.responseBody || null;
        const message =
          actualError?.message + (responseBody ? `; error details: ${responseBody}` : '') || 'Unknown Error Type';
        const type = actualError?.name || actualError?.type || 'Unknown Error Type';
        const param = actualError?.param || null;
        const code = statusCode;
        const errorResponse = { message, type, param, code };

        // headersSent为true，表明已经流式返回了数据。
        if (res.headersSent) {
          res.write(`data: { "error": ${JSON.stringify(errorResponse)} }\n\n`);
          res.end();
          return;
        }

        res.status(statusCode).json(errorResponse);
      },
    } as const;

    res.on('close', async () => {
      try {
        abort.abort('/chat-genui connection closed');
      } catch (error) {
        console.error(error);
      } finally {
        for (const client of clientsMap.values()) {
          await client.close();
        }
      }
    });

    try {
      const stream = streamText(options);

      for await (const chunk of stream.fullStream as unknown as AsyncGenerator<IOpenaiCompatibleChunk>) {
        if (abort.signal.aborted || hasError) {
          break;
        }
        const newChunk = openaiCompatibleTransformChunk(chunk, { model });
        if (newChunk) {
          // 在第一次真正写入前再设置为 SSE，避免出错时无法返回普通 JSON
          if (!res.headersSent) {
            res.setHeader('Content-Type', 'text/event-stream');
          }
          res.write('data: ' + JSON.stringify(newChunk) + '\n\n');
        }
      }
    } catch (error: any) {
      const statusCode = error?.statusCode ?? 500;
      const message = error?.message || 'Internal Server Error';

      console.error('Error in chat-genui streamText try/catch:', error);

      const errorResponse = { message, type: 'Internal Server Error', param: null, code: 'Internal Server Error' };

      if (hasError) {
        res.end();
        return;
      }
      hasError = true;
      if (!res.headersSent) {
        res.status(statusCode).json(errorResponse);
      } else {
        res.write('data: ' + JSON.stringify({ error: errorResponse }) + '\n\n');
        res.end();
      }
      return;
    }

    if (hasError) {
      res.end();
      return;
    }

    if (abort.signal.aborted) {
      res.write('data: [ABORTED]\n\n');
    } else {
      res.write('data: [DONE]\n\n');
    }

    res.end();
  };

  return { chatGenuiHandler };
}

export const checkMcpHandler = async (req: Request, res: Response) => {
  const abort = new AbortController();

  res.on('close', () => {
    try {
      abort.abort(new Error('/check-mcp connection closed'));
    } catch { }
  });

  try {
    const { name, url, headers, timeout } = JSON.parse(await getRawBody(req, { encoding: 'utf-8' }));
    const client = await initClients(name, { url, headers, timeout }, abort.signal);

    if (!client) {
      res.send({
        code: 500,
        message: 'Failed to connect to MCP server',
      });
      return;
    }

    const toolsList = await client.listTools();

    res.send({
      code: 200,
      data: toolsList.tools.map((t) => t.name),
    });
  } catch (error: any) {
    res.send({
      code: 500,
      message: error.message || String(error),
    });
  }
};
