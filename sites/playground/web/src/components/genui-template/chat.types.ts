import type { Component } from 'vue';
import type { BubbleRoleConfig, BubbleProps } from '@opentiny/tiny-robot';
import type { UseMessageReturn } from '@opentiny/tiny-robot-kit';

export interface IRolesConfig {
  user: Partial<BubbleRoleConfig>;
  assistant: Partial<BubbleRoleConfig>;
}

export interface ILlmConfig {
  url: string;
  model: string;
  temperature: number;
  prompt?: string;
  mcpServers?: any[];
}

export interface IProviderProps {
  targetElement?: string;
}

export interface ICommonComponent {
  name?: string;
  displayName?: string;
}

export interface IAbilityAugmentConfig {
  customComponents?: any;
  customSnippets?: any;
  customExamples?: any;
  customActions?: any;
}

export interface withMeataData<T> {
  metadata: Record<string, any>;
  component: T;
}

export interface ICustomizeSetting {
  customComponents?: Record<string, Component | withMeataData<Component>>;
  thinkComponent?: Component<BubbleProps>;
  footerComponent?: {
    user: Component<BubbleProps>;
    assistant: Component<BubbleProps>;
  };
  customActions?: any;
}

export interface IPreferencesSetting {
  requiredCompleteFieldSelectors?: string[];
  addToolCallContext: boolean; // 是否添加工具调用上下文
  showThinkingResult: boolean; // 是否显示思考结果
}

export interface LLMConfig {
  model: string;
  temperature: number;
}

export interface IGenuiConfig {
  addToolCallContext?: boolean;
  showThinkingResult?: boolean;
}

export interface IMessage {
  role: 'user' | 'assistant';
  content: string;
  messages?: IMessageItem[];
}

// 有几个插槽，参数都为这个类型
export interface IBubbleSlotsProps {
  index: number;
  bubbleProps: BubbleProps;
  isFinished: boolean;
  messageManager: UseMessageReturn;
}

/**
 * 通知事件发射器类型，专门用于处理 'notification' 事件
 */
export interface INotificationEventEmitter {
  on(eventName: 'notification', callback: (payload: INotificationPayload) => void, once?: boolean): void;
  off(eventName: 'notification', callback: (payload: INotificationPayload) => void): void;
  emit(eventName: 'notification', payload: INotificationPayload): void;
  once(eventName: 'notification', callback: (payload: INotificationPayload) => void): void;
}

export interface IGeneratingComponentProps {
  emitter: INotificationEventEmitter;
  message: IMessage;
  showThinkingResult: boolean;
}

export interface IChatProps {
  url: string;
  messages?: IMessage[];
  llmConfig?: LLMConfig;
  config?: IGenuiConfig;
  customConfig?: ICustomConfig;
}

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
  input: string;
  cardId: string;
  generatedTime: string;
  schema: string;
  id?: string;
  state?: Record<string, any>;
  prevSchema: string;
}

export interface IJsonPatchMessageItem {
  type: 'json-patch';
  content: string;
  input: string;
  cardId: string;
  generatedTime: string;
  schema: string;
  prevSchema: string;
}

export interface IMarkdownMessageItem {
  type: 'markdown';
  content: string;
  input: string;
  cardId: string;
}

/**
 * 消息项类型
 */
export type IMessageItem = IMarkdownMessageItem | IJsonPatchMessageItem | ISchemaCardMessageItem;

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
export type INotificationPayload = {
  type: 'markdown' | 'json-patch' | 'schema-card' | 'done';
  delta: IStreamDelta;
  chatMessage: IChatMessage;
  cardId?: string;
};

export interface ICustomConfig {
  customComponents?: Record<string, Component>;
  customComponentsSchema?: any;
  customSnippets?: any;
  customExamples?: any;
}

export interface ICustomModelProviderOptions {
  url: string;
  llmConfig: LLMConfig;
  config: IGenuiConfig;
  customConfig: ICustomConfig;
}

export interface IGenuiConfig {
  addToolCallContext?: boolean;
  showThinkingResult?: boolean;
}

export interface ICustomModelProviderOptions {
  url: string;
  llmConfig: LLMConfig;
  config: IGenuiConfig;
  customConfig: ICustomConfig;
}

export interface IOpenaiCompatibleChunk {
  id: string;
  object: string;
  model: string;
  created: number;
  choices: { index: number; delta: { content: string } }[];
}

export interface INotificationEvent {
  type: 'markdown' | 'schema-card' | 'json-patch' | 'tool' | 'done';
  content: string | Record<string, any>;
  name?: string;
  status?: string;
  [key: string]: any;
}

export interface ISchemaCard {
  id: string;
  title: string;
  schema: any;
  messages: IMessage[];
}
