import { removeSensitiveInfoWarning } from "./remove-sensitive-info-warning";

export const modifyChatBody = (body: any) => {
  const { messages } = body;
  if (messages?.length > 0) {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.requireMore) {
      removeSensitiveInfoWarning(lastMessage);
      messages.push({
        role: 'user',
        content: `上一轮内容未完成，请从上次中断的地方继续往下输出.不要生成已经输出过的内容, 否则拼接会失败，不要增加任何新的包裹（类似\`\`\`json\`\`\`这样的包裹不要添加），直接继续写，上一轮最后的字符为：\`${lastMessage.content.slice(-50)}\`（不包含头尾的反引号\`，注意中间的空格舒立轻摇对应上）, 请先输出上一轮最后的字符然后继续往下写。如果有思考过程，不要在推理过程或者思考过程中输出往下写的内容，直接在回复内容中继续往写下。`,
      });
    }
  }
  return body;
}