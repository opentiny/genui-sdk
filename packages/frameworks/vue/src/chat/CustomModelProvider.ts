import { BaseModelProvider, type ChatCompletionRequest, type ChatCompletionResponse } from '@opentiny/tiny-robot-kit';
import { chat } from './chat-api';
import type { IChatConfig, ICustomComponentItem, CustomFetch, ICustomActionItem } from './chat.types';
import type { IGenPromptSnippet, IGenPromptExample, IChatMessage, IStreamData, IStreamDelta } from '@opentiny/genui-sdk-core';
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
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') break;
      handler(data);
    }
  }
  return true;
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

export interface ICustomModelProviderOptions {
  getChatOptions: () => ICustomModelChatOptions;
}

export class CustomModelProvider extends BaseModelProvider {
  private getChatOptions: () => ICustomModelChatOptions;
  protected responseHandlers: IResponseHandler<IStreamData>[] = [];
  constructor({ getChatOptions }: ICustomModelProviderOptions) {
    super({ provider: 'custom' });
    this.getChatOptions = getChatOptions;
  }
  validateRequest(_: ChatCompletionRequest) { }

  setResponseHandlers(handlers: IResponseHandler<IStreamData>[]) {
    this.responseHandlers = handlers;
  }

  async getData(request: ChatCompletionRequest) {
    const {
      url,
      model,
      temperature,
      customComponents,
      customSnippets,
      customExamples,
      customActions,
      customFetch,
    } = this.getChatOptions();
    return await chat({
      url,
      messages: request.messages,
      model,
      temperature,
      signal: request.options?.signal,
      stream: request.options?.stream ?? true,
      customComponents,
      customSnippets,
      customExamples,
      customActions,
      customFetch,
    });
  }

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    let response: Response;
    try {
      response = await this.getData(request);
    } catch (error) {
      throw error;
    }
    const json = await response.json();

    // 将非流式伪装成流式
    const chatMessage = this.buildChatMessageFromResponse(json, request);

    const choice = json.choices?.[0] ?? {};
    const message = choice.message ?? {};

    return {
      id: json.id,
      object: json.object ?? 'chat.completion',
      created: json.created,
      model: json.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: chatMessage.content,
            reasoning_content: message.reasoning_content,
            tool_calls: message.tool_calls,
          },
          finish_reason: choice.finish_reason ?? 'stop',
        },
      ],
      usage: json.usage,
      role: chatMessage.role,
      content: chatMessage.content,
      messages: chatMessage.messages,
      finishInfo: chatMessage.finishInfo,
    } as ChatCompletionResponse & IChatMessage;
  }

  private buildChatMessageFromResponse(json: any, request: ChatCompletionRequest): IChatMessage {
    const message = json.choices?.[0]?.message ?? {};

    const context: any = {};
    this.setupStreamContext(context, request);

    let chatMessage!: IChatMessage;
    this.handlerStart(context, {
      onData: (data: IChatMessage) => {
        chatMessage = data;
      },
      onDone: () => {},
      onError: () => {},
    });

    const base = {
      id: json.id,
      object: 'chat.completion.chunk',
      model: json.model,
      created: json.created,
    };

    const deltas: IStreamDelta[] = [];
    if (message.reasoning_content) {
      deltas.push({ reasoning_content: message.reasoning_content });
    }
    if (message.tool_calls?.length) {
      deltas.push({ tool_calls: message.tool_calls });
    }
    if (message.tool_calls_result?.length) {
      deltas.push({ tool_calls_result: message.tool_calls_result });
    }
    if (message.content) {
      deltas.push({ content: message.content });
    }
    for (const delta of deltas) {
      this.handlerChunk(
        JSON.stringify({
          ...base,
          choices: [{ index: 0, delta, finish_reason: null }],
        }),
        context,
      );
    }

    this.handlerChunk(
      JSON.stringify({
        ...base,
        choices: [{ index: 0, delta: {}, finish_reason: json.choices?.[0]?.finish_reason ?? 'stop' }],
        usage: json.usage,
      }),
      context,
    );

    this.handlerEnd(context);

    return chatMessage;
  }

  async chatStream(request: any, handler: { onData: any; onDone: any; onError: any }) {
    const { onDone, onData, onError } = handler;
    const context: any = {};
    this.setupStreamContext(context, request);

    let response: Response;
    try {

      this.handlerBeforeRequest(context);

      response = await this.getData(request);
    } catch (error) {
      this.handlerRequestError(context, error)
      onDone({ type: 'error', error });
      return;
    }

    const bodyStream = response.body!;
    // const chunkStream = createAsyncIterableStream(getChunkStringStream(bodyStream));
    const reader = bodyStream.getReader();

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

  protected setupStreamContext(context: Record<string, unknown>, _request: ChatCompletionRequest) {
    const { chatConfig } = this.getChatOptions();
    context.chatConfig = chatConfig;
  }

  handlerChunk(rawData: string, context: any) {
    try {
      const streamData = JSON.parse(rawData) as IStreamData;

      for (const handler of this.responseHandlers) {
        if (handler.match(streamData, context)) {
          const handled = handler.handler(streamData, context);
          if (handled) break;
        } else if (handler.notMatchHandler) {
          const handled = handler.notMatchHandler(streamData, context);
          if (handled) break;
        }
      }
    } catch (e) {
      console.error(e);
    }
  }


  handlerBeforeRequest(context: any) {
    for (const handler of this.responseHandlers) {
      if (handler.beforeRequest) {
        handler.beforeRequest(context);
      }
    }
  }

  handlerRequestError(context: any, error?: unknown) {
    for (const handler of this.responseHandlers) {
      if (handler.onRequestError) {
        try {
          handler.onRequestError(context, error);
        } catch (error) {
          console.error(`[onRequestError] handler "${handler.name}" failed:`, error);
        }
      }
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
