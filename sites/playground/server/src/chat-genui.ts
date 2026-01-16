import { type Request, type Response } from 'express';
import { streamText, stepCountIs, tool } from 'ai';
import getRawBody from 'raw-body';
import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { fileURLToPath } from 'node:url';
import { rendererConfig } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/render-config';
import { ngRendererConfig } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/render-config'; 
import { genPrompt } from '@opentiny/genui-sdk-core';
import { Client } from '@modelcontextprotocol/sdk/client/index.js'; 
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { useProviderModelMapperSync } from './use-provider-mapper.js';
import { openaiCompatibleTransfromChunk, type IOpenaiCompatibleChunk } from './openai-compatible-transform.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { JsonSchema } from 'json-schema-to-zod';
import { jsonSchemaToZod } from 'json-schema-to-zod';

type StreamTextOptions = Parameters<typeof streamText>[0];

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

export function createChatGenui() {
  const chatGenuiHandler = async (req: Request, res: Response): Promise<void> => {
    const abort = new AbortController();
    const body = JSON.parse(await getRawBody(req, { encoding: 'utf-8' }));
    if (process.env.CHAT_UI_REPLAY_MODE === 'true') {
      res.setHeader('Content-Type', 'text/event-stream');
      const text = await fs.readFile(
        path.join(fileURLToPath(import.meta.url), '../replay/replay.txt'),
        'utf-8',
      );
      const data = text.split(/\r?\n\r?\n/);

      for await (const item of data) {
        res.write(item.trim() + '\n\n');
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      res.end();
      return;
    }

    const { tinygenui: tgCustomConfig } = body.metadata || {};

    const llmConfig = await generateLlmConfig(body?.llmConfig);
    const { model, temperature, prompt: customSystemPrompt, mcpServers = [], specificPrompt } = llmConfig;
    const { tools, clientsMap } = await generateAiSdkTools(
      mcpServers.filter((s) => s.enabled),
      abort.signal,
    );
    const renderConfigForFramework = body?.llmConfig?.framework === 'Angular' ?  ngRendererConfig : rendererConfig;
    const maxSteps = 30;
    let hasError = false; // 标记是否已经处理了错误
    const options: StreamTextOptions = {
      model,
      temperature,
      system: genPrompt(renderConfigForFramework, tgCustomConfig) + '\n' + specificPrompt + '\n' + customSystemPrompt,
      messages: body.messages,
      abortSignal: abort.signal,
      tools,
      toolChoice: 'auto',
      stopWhen: stepCountIs(maxSteps),
      onError: (error: any) => {
        if (hasError) {
          return
        }; 
        hasError = true;
        
        console.error('Error in chat-genui onError:', error);
        const actualError = error?.error?.cause ?? error?.error ?? error;
        const statusCode = actualError?.statusCode ?? 500;
        const responseBody = actualError?.responseBody || null;
        const message = actualError?.message + (responseBody ? `; error details: ${responseBody}` : '') || 'Unknown Error Type';
        const type = actualError?.name ||actualError?.type || 'Unknown Error Type';
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
        
      }
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
        const newChunk = openaiCompatibleTransfromChunk(chunk, { model });
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
