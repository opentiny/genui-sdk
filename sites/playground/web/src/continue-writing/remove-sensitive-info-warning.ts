import type { IChatMessage } from "@opentiny/genui-sdk-core";

export const sensitiveWarnings = [`\n\nThe current content involves sensitive information. Please try a new topic.`];
export function removeSensitiveInfoWarning(chatMessage: IChatMessage) {
  sensitiveWarnings.forEach(warning => {
    if (chatMessage.content.indexOf(warning) !== -1) {
      chatMessage.content = chatMessage.content.slice(0, chatMessage.content.indexOf(warning));

      const messages = chatMessage.messages;
      if (messages?.length > 0) {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.content.indexOf(warning) !== -1) {
          lastMessage.content = lastMessage.content.slice(0, lastMessage.content.indexOf(warning));
        }
      }
    }
  });
}
