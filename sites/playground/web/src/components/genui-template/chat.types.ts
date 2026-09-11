
import type { IStreamDelta } from '@opentiny/genui-sdk-core';

export interface LLMConfig {
  model: string;
  temperature: number;
}

/** 模板会话顶层消息类型：context-compress 为压缩摘要，其余为正常对话 */
export type { ContextCompressMessageType } from './template-chat-utils/context-message';

export interface ISchemaCardMessageItem {
  type: 'schema-card';
  content: string;
  input: string;
  cardId: string;
  generatedTime: string;
  schema: string;
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
  applyFailed?: boolean;
}

export type SchemaManualInputType = 'manual_edit_save' | 'user';

export interface ISchemaManualEditRecord {
  editId: string;
  schema: string;
  prevSchema: string;
  generatedTime: string;
  input: string;
  inputType?: SchemaManualInputType;

  sourceCardId?: string;

  sourceCardInput?: string;

  sourceCardGeneratedTime?: string;
}

export interface ISchemaManualMessageItem {
  type: 'schema-manual';
  content: string;
  input: string;
  inputType?: SchemaManualInputType;
  cardId: string;
  generatedTime: string;
  schema: string;
  prevSchema: string;

  edits?: ISchemaManualEditRecord[];
}

export interface IMarkdownMessageItem {
  type: 'markdown';
  content: string;
  input: string;
  cardId: string;
}

export interface ICustomMessageItem {
  type: string;
  content: any;
  [customKey: string]: any;
}

export type IMessageItem =
  | IMarkdownMessageItem
  | IJsonPatchMessageItem
  | ISchemaCardMessageItem
  | ISchemaManualMessageItem
  | ICustomMessageItem;

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
