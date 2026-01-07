import type { ToolSet, LanguageModel, ToolCallPart, ToolResultPart } from 'ai';

export interface ITransformOptions {
  model?: LanguageModel;
}

export interface IOpenaiCompatibleDelta {
  content?: string;
  tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[];
}

export enum ChunkObject {
  CHAT_COMPLETION_CHUNK = 'chat.completion.chunk',
}

const getModelName = (model?: LanguageModel) => {
  if (!model) {
    return '';
  }
  if (typeof model === 'string') {
    return model;
  } else {
    return model.modelId;
  }
};

export const transformMap: Record<string, (chunk: any, transformOptions: ITransformOptions) => any> = {
  'text-delta': (chunk: any, transformOptions: ITransformOptions) => {
    const newChunk = {
      id: chunk.id,
      object: ChunkObject.CHAT_COMPLETION_CHUNK,
      model: getModelName(transformOptions?.model),
      created: Date.now(),
      choices: [
        {
          index: 0,
          delta: { content: chunk.text },
          finish_reason: null,
        },
      ],
    };
    return newChunk;
  },
  'tool-call': (chunk: ToolCallPart, transformOptions: ITransformOptions) => {
    const newChunk = {
      id: chunk.toolCallId,
      object: ChunkObject.CHAT_COMPLETION_CHUNK,
      model: getModelName(transformOptions?.model),
      created: Date.now(),
      choices: [
        {
          index: 0,
          delta: {
            tool_calls: [
              {
                index: 0,
                id: chunk.toolCallId,
                type: 'function',
                function: { name: chunk.toolName, arguments: chunk.input },
              },
            ],
          },
          finish_reason: null,
        },
      ],
    };
    return newChunk;
  },
  'tool-result': (chunk: ToolResultPart & { input: ToolCallPart['input'] }, transformOptions: ITransformOptions) => {
    const newChunk = {
      id: chunk.toolCallId,
      object: ChunkObject.CHAT_COMPLETION_CHUNK,
      model: getModelName(transformOptions?.model),
      created: Date.now(),
      choices: [
        {
          index: 0,
          delta: {
            tool_calls_result: [
              {
                index: 0,
                id: chunk.toolCallId,
                type: 'function',
                function: {
                  name: chunk.toolName,
                  arguments: chunk.input,
                  result: chunk.output,
                },
              },
            ],
          },
          finish_reason: 'tool_calls',
        },
      ],
    };
    return newChunk;
  },
  'finish': (chunk: any, transformOptions: ITransformOptions) => {
    const newChunk = {
      id: chunk.id,
      object: ChunkObject.CHAT_COMPLETION_CHUNK,
      model: getModelName(transformOptions?.model),
      created: Date.now(),
      choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
      usage: {
        prompt_tokens: chunk.totalUsage.inputTokens || 0,
        completion_tokens: chunk.totalUsage.outputTokens || 0,
        total_tokens: chunk.totalUsage.totalTokens || 0,
      },
    };
    return newChunk;
  },
  'error': (chunk: any) => {
    const newChunk = {
      error: chunk.error,
    };
    return newChunk;
  },
};

export const openaiCompatibleTransfrom =
  <TOOLS extends ToolSet>(transformOptions: ITransformOptions) =>
  (options: { tools: TOOLS; stopStream: () => void }) => {
    return new TransformStream<any, any>({
      transform(chunk, controller) {
        const transformFn = transformMap[chunk.type as keyof typeof transformMap];
        if (transformFn) {
          controller.enqueue(transformFn(chunk, transformOptions));
        } else if (chunk.type === 'finish-step') {
          controller.enqueue({
            id: chunk.id,
            object: ChunkObject.CHAT_COMPLETION_CHUNK,
            model: getModelName(transformOptions?.model),
            created: Date.now(),
            choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
          });
          // options.stopStream();
        } else {
          // 其他类型暂不处理
          controller.enqueue(chunk);
        }
      },
    });
  };

export const openaiCompatibleTransfromChunk = (chunk: any, transformOptions: ITransformOptions): any => {
  const transformFn = transformMap[chunk.type as keyof typeof transformMap];
  if (transformFn) {
    return transformFn(chunk, transformOptions);
  } else {
    // 其他类型暂不处理
    return null;
  }
};
