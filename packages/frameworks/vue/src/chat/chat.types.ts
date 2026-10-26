import type { BubbleMessage, BubbleRoleConfig } from '@opentiny/tiny-robot';
import type { Component, VNode } from 'vue';
import type { IRendererSlots } from '../renderer';
import type {
  ConversationStorageStrategy,
  UseConversationReturn,
  UseMessageReturn,
} from '@opentiny/tiny-robot-kit';
import type {
  INotificationPayload,
  IGenPromptComponent,
  IGenPromptSnippet,
  IGenPromptExample,
  IGenPromptAction,
} from '@opentiny/genui-sdk-core';

export interface ICustomActionItem extends IGenPromptAction {
  execute: (params: any, context: Record<string, any>) => any;
}

export interface IRolesConfig {
  user: Partial<BubbleRoleConfig>;
  assistant: Partial<BubbleRoleConfig>;
}


// 自定义组件项，扩展 IGenPromptComponent 添加 ref（组件引用）
export interface ICustomComponentItem extends IGenPromptComponent {
  ref: Component; // 组件引用，用于传给 SchemaRenderer
}

export interface IChatConfig {
  addToolCallContext?: boolean;
  showThinkingResult?: boolean;
}

export interface IMessageItem {
  type: string;
  content: string;
  [customKey: string]: any;
}
export interface IMessage {
  role: 'user' | 'assistant';
  content: string;
  messages?: IMessageItem[];
}

// 有几个插槽，参数都为这个类型
export interface IBubbleSlotsProps {
  messages: BubbleMessage[];
  messageIndexes: number[];
  role?: string;
  contentIndex?: number;
  isFinished: boolean;
  messageEngine: UseMessageReturn;
  conversation: UseConversationReturn;
}

export interface IBubbleSlots {
  prefix?: (props: IBubbleSlotsProps) => VNode | VNode[] | null;
  suffix?: (props: IBubbleSlotsProps) => VNode | VNode[] | null;
  after?: (props: IBubbleSlotsProps) => VNode | VNode[] | null;
  'content-footer'?: (props: IBubbleSlotsProps) => VNode | VNode[] | null;
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

export interface IThinkComponentProps {
  emitter: INotificationEventEmitter;
  message: IMessage;
  showThinkingResult: boolean;
}

/**
 * 自定义请求函数类型
 * @param url 请求地址
 * @param options 请求选项（包含 method, headers, body, signal 等）
 * @returns 返回 Response 对象或 Promise<Response>
 */
export type CustomFetch = (
  url: string,
  options: {
    method: string;
    headers: Record<string, string>;
    body: string;
    signal?: AbortSignal;
  },
) => Promise<Response> | Response;

export interface IChatProps {
  url?: string;
  model?: string;
  temperature?: number;
  messages?: IMessage[];
  chatConfig?: IChatConfig;
  requiredCompleteFieldSelectors?: string[];
  customComponents?: ICustomComponentItem[];
  customSnippets?: IGenPromptSnippet[];
  customExamples?: IGenPromptExample[];
  customActions?: ICustomActionItem[];
  rendererSlots?: IRendererSlots;
  thinkComponent?: Component<any>;
  roleConfigs?: IRolesConfig;
  bubbleSlots?: IBubbleSlots;
  features?: ModelCapability;
  customFetch?: CustomFetch;
  autoSaveMessages?: boolean;
  conversationStorage?: ConversationStorageStrategy;
}

export interface ImageFeatures {
  enabled: boolean;
  maxImageSize: number;
  maxFilesPerRequest: number;
  supportedFileTypes: string[];
}
export interface ModelFeatures {
  supportImage?: boolean | ImageFeatures;
  supportFunctionCalling?: boolean;
  [key: string]: any;
}

export interface ModelCapability {
  supportImage?: ImageFeatures;
  supportFunctionCalling?: boolean;
  [key: string]: any;
}

export interface ModelInfo {
  name: string;
  features?: ModelFeatures;
}

export const DEFAULT_IMAGE_FEATURES: ImageFeatures = {
  enabled: true,
  maxImageSize: 10,
  maxFilesPerRequest: 3,
  supportedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'tiff'],
};
