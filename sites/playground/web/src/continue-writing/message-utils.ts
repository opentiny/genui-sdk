import type { IChatMessage } from "@opentiny/genui-sdk-core";

export function findLastContinueWritingMessage(chatMessage: IChatMessage, ignoreTypes: string[] = ['reasoning']) {
  const messages = chatMessage.messages;
  const index = findLastIndex(messages, message => !ignoreTypes.includes(message.type));
  const message = index !== -1 ? messages[index] : null;
  return {
    message,
    index
  }
}

export function findLastIndex<T>(arr: T[], condition: (item: T, index: number) => boolean) {
  if (arr.findLastIndex) { // findLastIndex needs ES2023
    return arr.findLastIndex(condition);
  }
  for (let i = arr.length - 1; i >= 0; i--) {
    if (condition(arr[i], i)) {
      return i;
    }
  }
  return -1;
}
