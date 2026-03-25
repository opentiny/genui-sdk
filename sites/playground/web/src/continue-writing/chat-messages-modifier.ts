import { reactive } from "vue";
import { removeSensitiveInfoWarning } from "./remove-sensitive-info-warning";

export const modifyChatBody = (body: any) => {
  const { messages } = body;
  if (messages?.length > 0) {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.requireMore) {
      removeSensitiveInfoWarning(lastMessage);
      messages.push({
        role: 'user',
        content: `上一轮内容未完成，请从上次中断的地方继续往下输出.不要生成已经输出过的内容, 否则拼接会失败，不要增加任何新的包裹（类似\`\`\`json\`\`\`这样的包裹不要添加），直接继续写，上一轮最后的字符为：\`${lastMessage.content.slice(-50)}\`（不包含头尾的反引号\`，注意中间的空格数量要对应上）, 请先输出上一轮最后的字符然后继续往下写。如果有思考过程，不要在推理过程或者思考过程中输出往下写的内容，直接在回复内容中继续往写下。`,
      });
    }
  }
  return body;
}

export function useGenerateMore(messageManager: any, index: number) {
  const markGenerateMore = () => {
    const { messages, send } = messageManager;
    const messageIndex = index;
    messages.value = messages.value.slice(0, messageIndex + 1);
    const lastMessage = messages.value[messageIndex];
    // Note: some platform feature support message.prefix = true/ message.partial = true, to finish the previous message,
    // but poor result, so we don't use it for now.
    lastMessage.requireMore = true;
    send();
  }

  const revertGenerateMore = () => {
    const { messages } = messageManager;
    const messageIndex = index;
    if (messages.value[messageIndex].originChatMessage) {
      try {
        messages.value[messageIndex] = reactive(JSON.parse(messages.value[messageIndex].originChatMessage));
      } catch (e) {
        console.error('revertGenerateMore: failed to parse originChatMessage', e);
        return;
      }
      messages.value[messageIndex].id = messages.value[messageIndex].id + '1'; // TODO: schema renderer with isError=true can not be reverted if id is not changed.
      // saveConversations(); // TODO: unable to save conversations
    } else {
      console.warn('revertGenerateMore: originChatMessage not found');
    }
  }

  return {
    markGenerateMore,
    revertGenerateMore,
  }
}
