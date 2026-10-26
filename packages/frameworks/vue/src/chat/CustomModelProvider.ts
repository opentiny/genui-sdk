import type { MessageRequestBody, ResponseProvider } from '@opentiny/tiny-robot-kit';
import { chat } from './chat-api';
import type { IChatConfig, ICustomComponentItem, CustomFetch, ICustomActionItem } from './chat.types';
import type { IGenPromptSnippet, IGenPromptExample } from '@opentiny/genui-sdk-core';
import type { IStreamData } from '@opentiny/genui-sdk-core';

export async function* responseToAsyncGenerator(
  response: Response,
  signal: AbortSignal,
): AsyncGenerator<any> {
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  if (!response.body) {
    throw new Error('Response body is empty');
  }
  yield* readChunks(response.body.getReader(), signal);
}

async function* readChunks(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signal: AbortSignal,
): AsyncGenerator<IStreamData> {
  let buffer = '';
  const decoder = new TextDecoder('utf-8');
  while (true) {
    if (signal.aborted) return;
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    while (true) {
      const lineEnd = buffer.indexOf('\n');
      if (lineEnd === -1) break;
      const line = buffer.slice(0, lineEnd).trim();
      buffer = buffer.slice(lineEnd + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') return;
      yield JSON.parse(data) as IStreamData;
    }
  }
}

/** 与 {@link chat} 入参对齐的选项；由调用方在每次请求前给出当前值（与 props / 状态同步） */
export interface ICustomModelChatOptions {
  url: string;
  model: string;
  temperature: number;
  chatConfig: IChatConfig;
  customComponents: ICustomComponentItem[];
  customSnippets: IGenPromptSnippet[];
  customExamples: IGenPromptExample[];
  customActions: ICustomActionItem[];
  customFetch?: CustomFetch;
}

export interface IGenuiResponseProviderOptions {
  getChatOptions: () => ICustomModelChatOptions;
}

export function createGenuiResponseProvider({
  getChatOptions,
}: IGenuiResponseProviderOptions): ResponseProvider {
  return async (request: MessageRequestBody, signal: AbortSignal) => {
    const {
      url,
      model,
      temperature,
      customComponents,
      customSnippets,
      customExamples,
      customActions,
      customFetch,
    } = getChatOptions();
    const response = await chat({
      url,
      messages: request.messages as any,
      model,
      temperature,
      signal,
      customComponents,
      customSnippets,
      customExamples,
      customActions,
      customFetch,
    });
    return responseToAsyncGenerator(response, signal);
  };
}
