import { Request, Response } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { genPrompt, type IGenPromptCustomConfig } from '@opentiny/genui-sdk-core';
import { rendererConfig } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/render-config';
import { streamText, stepCountIs } from 'ai';
import getRawBody from 'raw-body';
import { openaiCompatibleTransformChunk } from '@opentiny/genui-sdk-chat-completions';
import type { IOpenaiCompatibleChunk } from '@opentiny/genui-sdk-chat-completions';
import { generateLlmConfig, generateAiSdkTools } from './chat-genui.js';
import { generateJsonPatchPrompt } from './json-patch-prompt.js';
import { createToolResultStore, recoverToolCallResult } from './tool-result/index.js';
import type { IPlaygroundConfig, LLMConfigParams } from './types/index.js';

type StreamTextOptions = Parameters<typeof streamText>[0];

const getPlaygroundConfig = (playgroundStr: string) => {
  let playgroundConfig: IPlaygroundConfig = {
    mcpServers: [],
    framework: 'Vue',
    promptList: [],
    model: '',
    temperature: 0.3,
    agents: [],
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
      const { model, temperature, prompt: customSystemPrompt, specificPrompt, provider, extraBody } = llmConfig;
      const toolResultStore = createToolResultStore();
      const { tools, clientsMap } = await generateAiSdkTools(
        mcpServers.filter((s) => s.enabled),
        abort.signal,
        toolResultStore,
      );
      const maxSteps = 30;
      const systemPrompt = `${genPrompt(rendererConfig, tgCustomConfig)}
      ${body.templateSchema ? generateJsonPatchPrompt() : ''}
      ${specificPrompt}
      ${customSystemPrompt}`;

      const messages = body.messages;
      if (body.templateSchema) {
        const schemaJsonContext = `
          **当前 schemaJson（这是唯一可信的 ID 来源）：**
          \`\`\`schemaJson
          ${JSON.stringify(body.templateSchema, null, 2)}
          \`\`\`
          `;
        if (messages.length > 0 && messages[messages.length - 1].role === 'user') {
          if (Array.isArray(messages[messages.length - 1].content)) {
            messages[messages.length - 1].content.push({
              type: 'text',
              text: schemaJsonContext,
            });
          } else {
            messages[messages.length - 1].content += schemaJsonContext;
          }
        } else {
          messages.push({
            role: 'user',
            content: schemaJsonContext,
          });
        }
      }
      const providerOptions =
        provider?.name && extraBody && Object.keys(extraBody).length > 0
          ? ({ [provider.name]: extraBody } as StreamTextOptions['providerOptions'])
          : undefined;

      const options: StreamTextOptions = {
        model,
        temperature,
        system: systemPrompt,
        messages: messages,
        abortSignal: abort.signal,
        tools,
        toolChoice: 'auto',
        stopWhen: stepCountIs(maxSteps),
        ...(providerOptions ? { providerOptions } : {}),
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
            recoverToolCallResult(newChunk as Record<string, unknown>, toolResultStore);
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
