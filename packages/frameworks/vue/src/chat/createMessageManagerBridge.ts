import type { Ref } from 'vue';
import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import type { IMessageManagerBridge } from './chat.types';

export interface MessageEngineLike {
  messages: Ref<ChatMessage[]>;
  isProcessing: Ref<boolean>;
  requestState: Ref<string>;
  send: (...messages: ChatMessage[]) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  abortRequest: () => void | Promise<void>;
}

export interface CreateMessageManagerBridgeOptions {
  engine: MessageEngineLike;
  inputMessage: Ref<string>;
  onSendText?: (content: string, clearInput?: boolean) => Promise<void>;
}

export function createMessageManagerBridge(
  options: CreateMessageManagerBridgeOptions,
): IMessageManagerBridge {
  const { engine, inputMessage, onSendText } = options;

  return {
    messages: engine.messages,
    isProcessing: engine.isProcessing,
    inputMessage,
    requestState: engine.requestState,
    send: async (...messages: ChatMessage[]) => {
      await engine.send(...messages);
    },
    sendMessage: async (content = inputMessage.value, clearInput = true) => {
      const text = typeof content === 'string' ? content : inputMessage.value;
      if (onSendText) {
        await onSendText(text, clearInput);
        return;
      }
      if (clearInput) {
        inputMessage.value = '';
      }
      await engine.sendMessage(text);
    },
    abortRequest: () => engine.abortRequest(),
    addMessage: (message) => {
      if (Array.isArray(message)) {
        engine.messages.value.push(...message);
      } else {
        engine.messages.value.push(message);
      }
    },
  };
}
