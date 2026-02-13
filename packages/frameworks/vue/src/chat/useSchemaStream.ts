import type { IChatMessage } from '@opentiny/genui-sdk-core';

/**
 * Schema 流式处理 Hook
 * 用于处理流式返回中的 schemaJson 和 markdown 内容
 */
export default function useSchemaStream() {
  let inSchemaStream = false;
  let bufferText = '';

  const schemaFlag = '```schemaJson';
  const endFlag = '```';

  /**
   * 清除 schema 状态
   */
  const clearSchemaState = () => {
    inSchemaStream = false;
    bufferText = '';
  };

  /**
   * 判断是否为 schema 开始标志
   */
  const isSchemaJsonStart = (str: string): boolean => {
    const index = str.indexOf('`')
    if (index === -1) {
      return false
    }
    return schemaFlag.startsWith(str.substring(index, index + schemaFlag.length))
  }

  /**
   * 判断是否为 schema 结束标志
   */
  const isSchemaJsonEnd = (str: string): boolean => {
    const index = str.lastIndexOf('\n')
    if (index === -1) {
      return false
    }
    if (str.includes(`\n${endFlag}`)) {
      return true;
    }
    const newStr = str.slice(index).trim().substring(0, endFlag.length)
    return endFlag.startsWith(newStr)
  }

  /**
   * 处理 schema 流内容
   * @param content 流式响应中的增量内容
   * @param chatMessage 聊天消息对象，会被更新
   * @returns 如果正在返回 schema 流，返回 true，否则返回 false
   */
  const handleSchemaStream = (
    content: string,
    chatMessage: IChatMessage,
  ): boolean => {
    if (!content || typeof content !== 'string') {
      return false;
    }

    const deltaPart = bufferText + content;

    // 是否包含 schema 开始或者结束特征
    if (
      (!inSchemaStream && isSchemaJsonStart(deltaPart)) ||
      (inSchemaStream && isSchemaJsonEnd(deltaPart))
    ) {
      // 标志不完整
      const matchFlag = inSchemaStream ? /(\n\s*)```/ : schemaFlag;
      const matchPart = deltaPart.match(matchFlag)?.[0];
      if (!matchPart) {
        bufferText = deltaPart;
        return true;
      }

      chatMessage.content += deltaPart;

      // 在流式返回中且匹配到结束标志
      if (inSchemaStream) {
        const trimmedDelta = deltaPart.trim();
        const [schemaPart, markdownPart] = trimmedDelta.split(matchPart)

        // 更新最后一个 schema-card 的内容
        const lastMessage = chatMessage.messages[chatMessage.messages.length - 1];
        if (lastMessage?.type === 'schema-card') {
          lastMessage.content += schemaPart;
        }

        // 如果有后续的 markdown 内容，添加新的 markdown 消息
        if (markdownPart) {
          chatMessage.messages.push({
            type: 'markdown',
            content: markdownPart,
          });
        }
      }
      // 匹配到开始标志
      else {
        const trimmedDelta = deltaPart.trim();
        const [markdownPart, schemaPart] = trimmedDelta.split(matchPart)

        // 如果有前置的 markdown 内容，更新或添加 markdown 消息
        if (markdownPart) {
          const lastMessage = chatMessage.messages[chatMessage.messages.length - 1];
          if (lastMessage && lastMessage.type === 'markdown') {
            lastMessage.content += markdownPart;
          } else {
            chatMessage.messages.push({
              type: 'markdown',
              content: markdownPart,
            });
          }
        }

        // 添加新的 schema-card 消息
        chatMessage.messages.push({
          type: 'schema-card',
          content: schemaPart,
        });
      }

      inSchemaStream = !inSchemaStream;
      bufferText = '';
      return true;
    }

    bufferText = '';
    
    // 流式返回 schema 中
    if (inSchemaStream) {
      chatMessage.content += deltaPart;
      const lastMessage = chatMessage.messages[chatMessage.messages.length - 1];
      if (lastMessage && lastMessage.type === 'schema-card') {
        lastMessage.content += deltaPart;
      }
      return true;
    }

    // 普通 markdown 内容
    chatMessage.content += deltaPart;
    const lastMessage = chatMessage.messages[chatMessage.messages.length - 1];
    if (lastMessage?.type === 'markdown') {
      lastMessage.content += deltaPart;
    } else {
      chatMessage.messages.push({ type: 'markdown', content: deltaPart });
    }

    return false;
  };

  return {
    handleSchemaStream,
    clearSchemaState,
  };
}

