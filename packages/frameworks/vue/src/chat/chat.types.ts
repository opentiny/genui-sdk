import type { BubbleRoleConfig, BubbleProps } from '@opentiny/tiny-robot';
import type { Component } from 'vue';
import type { IRendererSlots } from '../renderer';
import type { EventEmitter } from './event-emitter';
import type { UseMessageReturn } from '@opentiny/tiny-robot-kit';
import type {
  INotificationPayload,
  IGenPromptComponent,
  IGenPromptSnippet,
  IGenPromptExample,
} from '@opentiny/genui-sdk-core';

export interface IRolesConfig {
  user: Partial<BubbleRoleConfig>;
  assistant: Partial<BubbleRoleConfig>;
}

export interface IProviderProps {
  targetElement?: string;
}

// 自定义组件项，扩展 IGenPromptComponent 添加 ref（组件引用）
export interface ICustomComponentItem extends IGenPromptComponent {
  ref?: Component; // 组件引用，用于传给 SchemaRenderer
}

export interface IChatConfig {
  addToolCallContext?: boolean;
  showThinkingResult?: boolean;
}

interface IMessageItem {
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
  customActions?: any[];
  rendererSlots?: IRendererSlots;
  thinkComponent?: Component<BubbleProps>;
  roles?: IRolesConfig;
  features?: ModelCapability;
  customFetch?: CustomFetch;
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
