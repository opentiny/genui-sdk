import { type Request, type Response } from 'express';
import { streamText, stepCountIs, tool } from 'ai';
import getRawBody from 'raw-body';
import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
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
import { buildAgentTools, isAllowedAgentUrl } from './a2a-tools/index.js';
import { buildSkillTools } from './skills/index.js';
import {
  createCompactToolCallResult,
  createToolResultStore,
  recoverToolCallResult,
  storeToolResult,
  type ToolResultStore,
} from './tool-result/index.js';
import type { IPlaygroundConfig, LLMConfig, LLMConfigParams, McpServer, McpServersConfig } from './types/index.js';

type StreamTextOptions = Parameters<typeof streamText>[0];

const isDevelopment = process.env.NODE_ENV === 'development';

const BUSY_ERROR_MESSAGE = '算力繁忙，请切换其他模型或稍后重试';

function extractStatusCode(error: any): number | undefined {
  if (!error) {
    return undefined;
  }
  if (typeof error.statusCode === 'number') {
    return error.statusCode;
  }
  if (typeof error?.lastError?.statusCode === 'number') {
    return error.lastError.statusCode;
  }
  if (Array.isArray(error.errors)) {
    for (const item of error.errors) {
      if (typeof item?.statusCode === 'number') {
        return item.statusCode;
      }
    }
  }
  return undefined;
}

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
  toolResultStore?: ToolResultStore,
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
          execute: async (args: any, { toolCallId }: { toolCallId: string }) => {
            try {
              // 调用 MCP 工具
              const result = await client.callTool({
                name: mcpTool.name,
                arguments: args,
              });

              if (toolResultStore) {

                const { compactResult, fullResult } = createCompactToolCallResult(mcpTool.name, toolCallId, result.content);
                storeToolResult(toolResultStore, toolCallId, fullResult);
                return compactResult;
              }
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

  const rawExtraBody = modelInfo?.model?.extraBody;
  const extraBody =
    rawExtraBody && typeof rawExtraBody === 'object'
      ? rawExtraBody
      : undefined;

  return {
    ...llmConfigParams,
    ...modelInfo,
    model: aiSDKModel,
    supportJsonFormat: modelInfo?.model.supportJsonFormat || false,
    specificPrompt: modelInfo?.model.specificPrompt || '',
    extraBody
  };
}

const getPlaygroundConfig = (playgroundStr: string) => {
  let playgroundConfig: Partial<IPlaygroundConfig> = {};

  try {
    const parsed = JSON.parse(playgroundStr) as IPlaygroundConfig;
    if (parsed && typeof parsed === 'object') {
      playgroundConfig = parsed;
    }
  } catch (error) {
    console.error('Failed to parse playground from metadata:', error);
  }

  const rawAgents = playgroundConfig.agents || [];
  const agents = rawAgents.filter((agent) => {
    const url = agent.api?.url;
    if (!url) return false;
    // 开发态放开 URL 安全校验，生产态保持 SSRF 防护
    return isDevelopment || isAllowedAgentUrl(url);
  });

  return {
    mcpServers: playgroundConfig.mcpServers || [],
    framework: playgroundConfig.framework || 'Vue',
    userAppendPrompt: playgroundConfig.promptList?.filter(Boolean).join('\n') || '',
    model: playgroundConfig.model || '',
    temperature: playgroundConfig.temperature || 0.3,
    agents,
    skills: playgroundConfig.skills || [],
  };
};

export function createChatGenui() {
  const chatGenuiHandler = async (req: Request, res: Response): Promise<void> => {
    const abort = new AbortController();
    const body = JSON.parse(await getRawBody(req, { encoding: 'utf-8' }));
    if (process.env.CHAT_UI_REPLAY_MODE === 'true') {
      res.setHeader('Content-Type', 'text/event-stream');
      const text = await fs.readFile(path.join(fileURLToPath(import.meta.url), '../../replay/replay.txt'), 'utf-8');
      const data = text.split(/\r?\n\r?\n/);

      for await (const item of data) {
        res.write(item.trim() + '\n\n');
        await new Promise((resolve) => setTimeout(resolve, 10));
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
    const { mcpServers, framework, userAppendPrompt, agents, skills } = playgroundConfig;

    const llmConfigParams: LLMConfigParams = {
      model: playgroundConfig.model,
      temperature: playgroundConfig.temperature,
      mcpServers,
      skills,
    };

    const llmConfig = await generateLlmConfig(llmConfigParams);
    const { model, temperature, specificPrompt, provider, extraBody } = llmConfig;
    const toolResultStore = createToolResultStore();
    const { tools: mcpTools, clientsMap } = await generateAiSdkTools(
      mcpServers.filter((s) => s.enabled),
      abort.signal,
      toolResultStore,
    );
    const agentTools = buildAgentTools(agents, abort.signal);
    const { tools: skillTools, systemPrompt: skillPrompt } = buildSkillTools(skills);
    const duplicateToolNames = new Set<string>();
    const seenToolNames = new Set<string>();
    for (const name of [
      ...Object.keys(mcpTools),
      ...Object.keys(agentTools),
      ...Object.keys(skillTools),
    ]) {
      if (seenToolNames.has(name)) duplicateToolNames.add(name);
      seenToolNames.add(name);
    }
    if (duplicateToolNames.size) {
      console.warn(`Duplicate tool names detected: ${[...duplicateToolNames].join(', ')}`);
    }
    const tools = { ...mcpTools, ...agentTools, ...skillTools };

    const renderConfigForFramework = framework === 'Angular' ? ngRendererConfig : rendererConfig;
    const maxSteps = 30;
    let hasError = false; // 标记是否已经处理了错误

    const providerOptions =
      provider?.name && extraBody && Object.keys(extraBody).length > 0
        ? { [provider.name]: extraBody } as StreamTextOptions['providerOptions']
        : undefined;

    const options: StreamTextOptions = {
      model,
      temperature,
      system:
        genPrompt(renderConfigForFramework, tgCustomConfig) +
        '\n' +
        specificPrompt +
        '\n' +
        userAppendPrompt +
        '\n' +
        skillPrompt,
      messages: body.messages,
      abortSignal: abort.signal,
      tools,
      toolChoice: 'auto',
      stopWhen: stepCountIs(maxSteps),
      ...(providerOptions ? { providerOptions } : {}),
      onError: (error: any) => {
        if (hasError) {
          return;
        }
        hasError = true;

        console.error('Error in chat-genui onError:', error);
        const actualError = error?.error?.cause ?? error?.error ?? error;
        const rawStatusCode = extractStatusCode(actualError);
        const statusCode =
          typeof rawStatusCode === 'number' &&
          Number.isInteger(rawStatusCode) &&
          rawStatusCode >= 100 &&
          rawStatusCode <= 599
            ? rawStatusCode
            : 500;
        const responseBody = actualError?.responseBody ?? null;
        const detailsPart = responseBody
          ? `; error details: ${typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody)}`
          : '';
        const built = (actualError?.message ?? '') + detailsPart;
        const message =
          statusCode === 429
            ? BUSY_ERROR_MESSAGE
            : built.trim() !== ''
              ? built
              : 'Unknown Error Type';
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
          recoverToolCallResult(newChunk, toolResultStore);
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
    } catch {}
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
