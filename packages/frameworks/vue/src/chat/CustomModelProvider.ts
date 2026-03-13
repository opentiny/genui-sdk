import { BaseModelProvider, type ChatCompletionRequest, type ChatCompletionResponse } from '@opentiny/tiny-robot-kit';
import { chat } from './chat-api';
import type { IChatConfig, ICustomComponentItem, CustomFetch, ICustomActionItem } from './chat.types';
import type { IGenPromptSnippet, IGenPromptExample } from '@opentiny/genui-sdk-core';
import type { IStreamDelta, IChatMessage } from '@opentiny/genui-sdk-core';
import type { IResponseHandler } from './response-handler';

async function readChunk(reader: ReadableStreamDefaultReader<Uint8Array>, handler: (data: string) => void) {
  let buffer = '';
  const decoder = new TextDecoder('utf-8');
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    while (true) {
      const lineEnd = buffer.indexOf('\n');
      if (lineEnd === -1) break;
      const line = buffer.slice(0, lineEnd).trim();
      buffer = buffer.slice(lineEnd + 1);
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') break;
      handler(data);
    }
  }
  return true;
}
export interface ICustomModelProviderOptions {
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
export class CustomModelProvider extends BaseModelProvider {
  private url: string;
  private model: string;
  private temperature: number;
  private customComponents: ICustomComponentItem[];
  private customSnippets: IGenPromptSnippet[];
  private customExamples: IGenPromptExample[];
  private customActions: ICustomActionItem[];
  private chatConfig: IChatConfig;
  private customFetch?: CustomFetch;
  protected responseHandlers: IResponseHandler<IStreamDelta>[] = [];
  constructor({ url, model, temperature, chatConfig, customComponents, customSnippets, customExamples, customActions, customFetch }: ICustomModelProviderOptions) {
    super({ provider: 'custom' });
    this.url = url;
    this.model = model;
    this.temperature = temperature;
    this.customComponents = customComponents;
    this.customSnippets = customSnippets;
    this.customExamples = customExamples;
    this.customActions = customActions;
    this.chatConfig = chatConfig;
    this.customFetch = customFetch;
  }
  validateRequest(_: ChatCompletionRequest) { }

  changeLlmConfig(model: string, temperature: number) {
    this.model = model;
    this.temperature = temperature;
  }
  setResponseHandlers(handlers: IResponseHandler<IStreamDelta>[]) {
    this.responseHandlers = handlers;
  }

  async getData(request: ChatCompletionRequest) {
    return await chat(
      {
        url: this.url,
        messages: request.messages,
        model: this.model,
        temperature: this.temperature,
        signal: request.options?.signal,
        customComponents: this.customComponents,
        customSnippets: this.customSnippets,
        customExamples: this.customExamples,
        customActions: this.customActions,
        customFetch: this.customFetch,
      }
    );
  }

  async chat(_: ChatCompletionRequest) {
    return {} as ChatCompletionResponse;
  }

  async chatStream(request: any, handler: { onData: any; onDone: any; onError: any }) {
    const { onDone, onData, onError } = handler;
    let response: Response;
    try {
      response = await this.getData(request);
    } catch (error) {
      onDone({ type: 'error', error });
      return;
    }
    const bodyStream = response.body!;
    // const chunkStream = createAsyncIterableStream(getChunkStringStream(bodyStream));
    const reader = bodyStream.getReader();
    
    const context: any = {};
    context.chatConfig = this.chatConfig;

    const signal = request.options?.signal;
    signal?.addEventListener('abort',
      () => {
        reader.cancel();
        this.handlerEnd(context);
      },
      { once: true }
    )

    this.handlerStart(context, handler);

    await readChunk(reader, (data) => {
      this.handlerChunk(data, context);
    });
    this.handlerEnd(context);
    
  }

  handlerChunk(data: string, context: any) {
    try {
      const chunk = JSON.parse(data);
      const delta = chunk.choices?.[0]?.delta || {};
    
      for (const handler of this.responseHandlers) {
        if (handler.match(delta, context)) {
          const handled = handler.handler(delta,  context);
          if (handled) break;
        } else if (handler.notMatchHandler) {
          const handled = handler.notMatchHandler(delta, context);
          if (handled) break;
        }
      }
    } catch (e) {
      console.error(e);
    }
  }


  handlerStart(context: any, handlers: { onData: (data: IChatMessage) => void, onDone: () => void, onError: (error: Error) => void }) {
    for (const handler of this.responseHandlers) {
      if (handler.start) {
        handler.start(context, handlers);
      }
    }
  }

  handlerEnd(context: any) {
    for (const handler of this.responseHandlers) {
      if (handler.end) {
        handler.end(context);
      }
    }
  }

}
