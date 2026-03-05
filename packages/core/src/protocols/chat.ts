/**
 * OpenAI 兼容的流式响应块
 */
export interface IOpenaiCompatibleChunk {
  id: string;
  object: string;
  model: string;
  created: number;
  choices: { index: number; delta: { content: string } }[];
}

/**
 * 流式响应的增量数据
 */
export interface IStreamDelta {
  content?: string;
  tool_calls?: Array<{
    id: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_calls_result?: Array<{
    id: string;
    function: {
      arguments: any;
      result: any;
    };
  }>;
}

export interface ISchemaCardMessageItem {
  type: 'schema-card';
  content: string;
  id?: string;
  state?: Record<string, any>;
}

export interface IMarkdownMessageItem {
  type: 'markdown';
  content: string;
}

export interface IReasoningMessageItem {
  type: 'reasoning';
  content: string;
  thinking?: boolean;
}
export interface IToolMessageItem {
  type: 'tool';
  name: string;
  formatPretty?: boolean;
  status: 'running' | 'success' | 'failed' | 'cancelled';
  content: string;
  id?: string;
}
/**
 * 消息项类型
 */
export type IMessageItem =
  | IMarkdownMessageItem
  | ISchemaCardMessageItem
  | IToolMessageItem
  | IReasoningMessageItem;

/**
 * 单轮对话中的消息对象
 */
export interface IChatMessage {
  role: 'assistant';
  content: string;
  messages: IMessageItem[];
}

/**
 * 流式通知事件负载，包含事件类型、增量数据和完整的消息对象
 */
export type INotificationPayload =
  | {
      type: 'markdown' | 'schema-card' | 'done';
      delta: IStreamDelta;
      chatMessage: IChatMessage;
    }
  | {
      type: 'tool';
      delta: IStreamDelta;
      chatMessage: IChatMessage;
      toolCallData: IMessageItem & { type: 'tool' };
    };
