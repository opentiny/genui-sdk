import { shallowRef } from 'vue';

export interface IConversationMessage {
  role?: string;
  messages?: unknown[];
}

export interface IBuilderConversationBridge {
  getMessages: () => readonly IConversationMessage[];
}

const getMessagesFn = shallowRef<(() => readonly IConversationMessage[]) | null>(null);

export function registerBuilderConversationBridge(bridge: IBuilderConversationBridge) {
  getMessagesFn.value = bridge.getMessages;
}

export function unregisterBuilderConversationBridge() {
  getMessagesFn.value = null;
}

export function useBuilderConversationMessages() {
  return getMessagesFn;
}

export function getBuilderConversationMessages() {
  return getMessagesFn.value;
}
