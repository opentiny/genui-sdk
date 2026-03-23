import type { IChatMessage } from "@opentiny/genui-sdk-core";

export interface IBubbleSlotsProps {
  index: number;
  bubbleProps: { [key: string]: any };
  isFinished: boolean;
  messageManager: { [key: string]: any };
  chatMessage: IChatMessage;
}

export interface IRendererSlotsProps {
  schema: any;
  isError: boolean;
  isFinished: boolean;
}

export interface INotificationEventEmitter {
  on(eventName: 'notification', callback: (payload: any) => void, once?: boolean): void;
  off(eventName: 'notification', callback: (payload: any) => void): void;
  emit(eventName: 'notification', payload: any): void;
  once(eventName: 'notification', callback: (payload: any) => void): void;
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

export interface IThinkComponentProps {
  emitter: INotificationEventEmitter;
  message: IMessage;
  showThinkingResult: boolean;
}
