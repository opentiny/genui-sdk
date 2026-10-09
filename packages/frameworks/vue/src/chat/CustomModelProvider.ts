import { BaseModelProvider, type ChatCompletionRequest, type ChatCompletionResponse } from '@opentiny/tiny-robot-kit';
import { chat } from './chat-api';
import type { IChatConfig, ICustomComponentItem, CustomFetch, ICustomActionItem } from './chat.types';
import type {
  IGenPromptSnippet,
  IGenPromptExample,
  IChatMessage,
  ICompleteData,
  IStreamData,
  IStreamDelta,
} from '@opentiny/genui-sdk-core';
import { toCompleteData, type IResponseHandler, type ICompleteResponseJson } from './response-handler';

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

  /**
   * 非流式请求：完整响应一次到齐后直接渲染，不拆成流式增量。
   * 与 chatStream 的差别仅在数据来源 —— 这里把整个 message 交给 handler 的 complete 入口。
   */
  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const context: any = {};
    this.setupStreamContext(context, request);

    let json: ICompleteResponseJson;
    try {
      this.handlerBeforeRequest(context);
      const response = await this.getData(request);
      json = await response.json();
    } catch (error) {
      this.handlerRequestError(context, error);
      throw error;
    }

    // onData 在这条路径上没有消费方（非流式是一次性返回，没有增量通道），传空实现即可。
    // init.start 会把消息挂在 context.chatMessage 上，后续 handler 都往它身上写。
    this.handlerStart(context, {
      onData: () => {},
      onDone: () => {},
      onError: () => {},
    });
    this.handleCompleteResponse(toCompleteData(json), context);
    this.handlerEnd(context);

    const chatMessage: IChatMessage = context.chatMessage;
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

  /**
   * 把完整响应分发给各 response handler。
   *
   * 按数组顺序单趟遍历，不能调整成「先跑所有 complete 再跑回退」—— handler 之间靠共享 context 协作
   * （例如 playground 的 movePartialSchemaJsonToLastMessage 依赖自己排在 overlapEliminator / content 之前），位置即契约。
   */
  private handleCompleteResponse(data: ICompleteData, context: any) {
    for (const handler of this.responseHandlers) {
      if (handler.complete) {
        handler.complete(data, context);
        continue;
      }
      this.dispatchAspects(handler, data, context);
    }
  }

  /**
   * 兼容回退：给尚未实现 complete 的自定义 handler 按切面分发单个 IStreamData。
   *
   * 这里不构造 chat.completion.chunk 信封、不做 JSON 序列化往返，只是复用既有的 match / handler 契约。
   * 与流式的一点差异：不按 handler 返回值中断。流式的中断用于「内容还不够，先存着」的延迟场景，
   * 而完整响应一次到齐，没有需要延迟的内容。
   */
  private dispatchAspects(handler: IResponseHandler<IStreamData>, data: ICompleteData, context: any) {
    for (const delta of this.toAspectDeltas(data)) {
      const streamData: IStreamData = { choices: [{ index: 0, delta }] };
      if (handler.match(streamData, context)) {
        handler.handler(streamData, context);
      } else if (handler.notMatchHandler) {
        handler.notMatchHandler(streamData, context);
      }
    }
  }

  /**
   * 完整响应按切面拆出候选增量，顺序与流式下这些切面的到达顺序一致。
   * content 只在真值时生成 —— 空串在流式下也不会产生 content chunk。
   */
  private toAspectDeltas(data: ICompleteData): IStreamDelta[] {
    const deltas: IStreamDelta[] = [];
    if (data.reasoning_content) {
      deltas.push({ reasoning_content: data.reasoning_content });
    }
    if (data.tool_calls?.length) {
      deltas.push({ tool_calls: data.tool_calls });
    }
    if (data.tool_calls_result?.length) {
      deltas.push({ tool_calls_result: data.tool_calls_result });
    }
    if (data.content) {
      deltas.push({ content: data.content });
    }
    return deltas;
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
