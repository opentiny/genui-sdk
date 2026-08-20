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

  /**
   * 非流式聊天：一次请求拿到完整响应后，复用流式的 responseHandlers 管线
   * 构建出与 chatStream 对齐的 IChatMessage，再包装成 ChatCompletionResponse。
   *
   * 返回对象除契约字段外，额外挂载 role / content / messages / finishInfo，
   * 与 chatStream 推给渲染层的消息结构一致（GenuiChat 会把返回值整体入列并按 messages 渲染）。
   * 构建过程中 handlerEnd 等会触发 notification 事件，此时无监听者（loading 组件尚未挂载），
   * 属无害的空发。
   */
  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    let response: Response;
    try {
      response = await this.getData(request);
    } catch (error) {
      throw error;
    }
    const json = await response.json();

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
      // 渲染相关字段：与 chatStream 推送的 IChatMessage 对齐
      role: chatMessage.role,
      content: chatMessage.content,
      messages: chatMessage.messages,
      finishInfo: chatMessage.finishInfo,
    } as ChatCompletionResponse & IChatMessage;
  }

  /**
   * 将 OpenAI 兼容的非流式响应（choices[0].message 完整消息）喂给与流式完全相同的
   * responseHandlers 管线，构建出 IChatMessage。
   *
   * 不能把 content / reasoning_content / tool_calls / finish_reason+usage 塞进同一个
   * delta：handlerChunk 的管线「命中即 break」（finish-info 排在最前，遇到
   * finish_reason && usage 就短路），且一个 chunk 只能被首个命中处理器消费。因此按流式
   * 顺序逐条拆分：推理 → 工具调用 → 工具结果 → 正文 → finish-info。
   */
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

    // 每种 delta 单独成 chunk（与流式一致），工具结果须在工具调用之后处理
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

    // finish-info：finish_reason + usage 单独成 chunk，避免打断内容/工具的匹配
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
    this.setupStreamContext(context, request);

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
