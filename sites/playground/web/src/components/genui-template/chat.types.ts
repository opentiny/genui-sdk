/**
 * 模板专用 chat 类型，仅保留无法从 @opentiny/genui-sdk-vue / @opentiny/genui-sdk-core 复用的部分。
 * IMessage、IBubbleSlotsProps 等请从 @opentiny/genui-sdk-vue 引入；
 * IStreamDelta 请从 @opentiny/genui-sdk-core 引入。
 */
import type { IStreamDelta } from '@opentiny/genui-sdk-core';

export interface LLMConfig {
  model: string;
  temperature: number;
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

export type IMessageItem = IMarkdownMessageItem | IJsonPatchMessageItem | ISchemaCardMessageItem;

export interface IChatMessage {
  role: 'assistant';
  content: string;
  messages: IMessageItem[];
}

export type INotificationPayload = {
  type: 'markdown' | 'json-patch' | 'schema-card' | 'done';
  delta: IStreamDelta;
  chatMessage: IChatMessage;
  cardId?: string;
};
