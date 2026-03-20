import type { IChatMessage } from "@opentiny/genui-sdk-core";

export function findLastContinueWritingMessage(chatMessage: IChatMessage, ignoreTypes: string[] = ['reasoning']) {
  const messages = chatMessage.messages;
  const index = messages.findLastIndex(message => !ignoreTypes.includes(message.type)); // findLastIndex needs ES2023
  const message = messages[index];
  return {
    message,
    index
  }
}

