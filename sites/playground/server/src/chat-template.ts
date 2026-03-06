import { Request, Response } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { genPrompt, type IGenPromptCustomConfig } from '@opentiny/genui-sdk-core';
import { rendererConfig } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/render-config';
import { streamText, stepCountIs, type StreamTextOptions } from 'ai';
import getRawBody from 'raw-body';
import { openaiCompatibleTransformChunk } from '@opentiny/genui-sdk-chat-completions';
import type { IOpenaiCompatibleChunk } from '@opentiny/genui-sdk-chat-completions';
import { generateLlmConfig, generateAiSdkTools } from './chat-genui.js';
import { generateJsonPatchPrompt } from './json-patch-prompt.js';

export type McpServerConfig = {
  name: string;
  url: string;
  description?: string;
  enabled?: boolean;
  headers?: Record<string, string>;
  timeout?: number;
};
interface IPlaygroundConfig {
  mcpServers: McpServerConfig[];
  framework: string;
  promptList: string[];
  model: string;
  temperature: number;
}

export type LLMConfigParams = {
  model?: string;
  temperature?: number;
  prompt?: string;
  mcpServers?: McpServerConfig[];
};

const getPlaygroundConfig = (playgroundStr: string) => {
  let playgroundConfig: IPlaygroundConfig = {
    mcpServers: [],
    framework: 'Vue',
    promptList: [],
    model: '',
    temperature: 0.3,
  };

  try {
    playgroundConfig = JSON.parse(playgroundStr);
  } catch (error) {
    console.error('Failed to parse playground from metadata:', error);
  }

  return {
    mcpServers: playgroundConfig.mcpServers || [],
    framework: playgroundConfig.framework || 'Vue',
    userAppendPrompt: playgroundConfig.promptList?.filter(Boolean).join('\n') || '',
    model: playgroundConfig.model || '',
    temperature: playgroundConfig.temperature || 0.3,
  };
};

export const createChatTemplate = () => {
  return {
    chatTemplateHandler: async (req: Request, res: Response) => {
      const abort = new AbortController();
      const body = JSON.parse(await getRawBody(req, { encoding: 'utf-8' }));
      if (process.env.CHAT_UI_REPLAY_MODE === 'true') {
        const text = await fs.readFile(
          path.join(fileURLToPath(import.meta.url), '../../chat-template-replay/replay.txt'),
          'utf-8',
        );
        const data = text.split(/\r?\n\r?\n/);
        for await (const item of data) {
          if (abort.signal.aborted) {
            res.write('data: [ABORTED]\n\n');
            res.end();
            return;
          }
          res.write(item.trim() + '\n\n');
          await new Promise((resolve) => setTimeout(resolve, 200));
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
      const { mcpServers, framework, userAppendPrompt } = playgroundConfig;

      const llmConfigParams: LLMConfigParams = {
        model: playgroundConfig.model,
        temperature: playgroundConfig.temperature,
        mcpServers,
      };

      const llmConfig = await generateLlmConfig(llmConfigParams);
      const { model, temperature, prompt: customSystemPrompt, specificPrompt } = llmConfig;
      const { tools, clientsMap } = await generateAiSdkTools(
        mcpServers.filter((s) => s.enabled),
        abort.signal,
      );
      const maxSteps = 30;
      const systemPrompt = `${genPrompt(rendererConfig, tgCustomConfig)}
      ${body.templateSchema ? generateJsonPatchPrompt(body.templateSchema) : ''}
      ${specificPrompt}
      ${customSystemPrompt}`;
      const options: StreamTextOptions = {
        model,
        temperature,
        system: systemPrompt,
        messages: body.messages,
        abortSignal: abort.signal,
        tools,
        toolChoice: 'auto',
        stopWhen: stepCountIs(maxSteps),
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
          if (abort.signal.aborted) {
            break;
          }
          const newChunk = openaiCompatibleTransformChunk(chunk, { model });

          if (newChunk) {
            res.write('data: ' + JSON.stringify(newChunk) + '\n\n');
          }
        }
      } catch (error: any) {
        res.write('data: [ERROR]\n\n');
        res.end();
        return;
      }

      if (abort.signal.aborted) {
        res.write('data: [ABORTED]\n\n');
      } else {
        res.write('data: [DONE]\n\n');
      }

      res.end();
    },
  };
};
