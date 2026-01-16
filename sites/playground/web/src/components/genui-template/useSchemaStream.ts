import type { IChatMessage } from './chat.types';

/**
 * Schema 流式处理 Hook
 * 用于处理流式返回中的 schemaJson、jsonPatch 和 markdown 内容
 */
export default function useSchemaStream() {
  let inSchemaStream = false;
  let bufferText = '';
  let currentStreamType: 'json-patch' | 'schema-card' | null = null;

  const jsonPatchFlag = '```jsonPatch';
  const schemaJsonFlag = '```schemaJson';
  const endFlag = '```';

  /**
   * 清除 schema 状态
   */
  const clearSchemaState = () => {
    inSchemaStream = false;
    bufferText = '';
    currentStreamType = null;
  };

  /**
   * 检测开始标志类型
   * @param str 待检测的字符串
   * @returns 检测到的标志类型，如果未检测到或标志不完整返回 null
   */
  const detectSchemaStart = (str: string): 'json-patch' | 'schema-card' | null => {
    // 查找 ``` 的位置
    const codeBlockIndex = str.indexOf('```');
    if (codeBlockIndex === -1) {
      return null;
    }

    // 获取 ``` 后面的内容
    const afterCodeBlock = str.substring(codeBlockIndex + 3);

    // 检查是否完整匹配 jsonPatch 标志
    if (afterCodeBlock.startsWith('jsonPatch')) {
      return 'json-patch';
    }

    // 检查是否完整匹配 schemaJson 标志
    if (afterCodeBlock.startsWith('schemaJson')) {
      return 'schema-card';
    }

    // 检查是否可能是标志的前缀（标志被分割的情况）
    const jsonPatchSuffix = jsonPatchFlag.substring(3); // 'jsonPatch'
    const schemaJsonSuffix = schemaJsonFlag.substring(3); // 'schemaJson'

    // 如果 afterCodeBlock 是某个标志的前缀，返回 null（表示需要继续等待）
    const isJsonPatchPrefix = jsonPatchSuffix.startsWith(afterCodeBlock);
    const isSchemaJsonPrefix = schemaJsonSuffix.startsWith(afterCodeBlock);

    // 如果是前缀，返回 null（需要缓存等待完整标志）
    if (isJsonPatchPrefix || isSchemaJsonPrefix) {
      return null;
    }

    // 不是标志，返回 null
    return null;
  };

  /**
   * 判断是否为 schema 结束标志
   */
  const isSchemaJsonEnd = (str: string): boolean => {
    if (!str.includes(endFlag)) {
      return false;
    }
    const index = str.lastIndexOf('\n');
    if (index === -1) {
      return str.includes(endFlag);
    }
    const newStr = str.slice(index).trim().substring(0, endFlag.length);
    return endFlag.startsWith(newStr) || newStr === endFlag;
  };

  /**
   * 检查内容中是否包含不完整的标志（需要缓存）
   * @param str 待检查的字符串
   * @returns 如果包含不完整的标志返回 true
   */
  const hasIncompleteFlag = (str: string): boolean => {
    const codeBlockIndex = str.indexOf('```');
    if (codeBlockIndex === -1) {
      return false;
    }

    const afterCodeBlock = str.substring(codeBlockIndex + 3);
    const jsonPatchSuffix = jsonPatchFlag.substring(3); // 'jsonPatch'
    const schemaJsonSuffix = schemaJsonFlag.substring(3); // 'schemaJson'

    // 检查是否是完整标志
    if (afterCodeBlock.startsWith('jsonPatch') || afterCodeBlock.startsWith('schemaJson')) {
      return false; // 完整标志，不需要缓存
    }

    // 检查是否可能是标志的前缀
    const isJsonPatchPrefix = jsonPatchSuffix.startsWith(afterCodeBlock);
    const isSchemaJsonPrefix = schemaJsonSuffix.startsWith(afterCodeBlock);

    return isJsonPatchPrefix || isSchemaJsonPrefix;
  };

  /**
   * 处理 schema 流内容
   * @param content 流式响应中的增量内容
   * @param chatMessage 聊天消息对象，会被更新
   * @returns 如果正在返回 schema 流，返回 true，否则返回 false
   */
  const handleSchemaStream = (content: string, chatMessage: IChatMessage, input: string, cardId: string): boolean => {
    if (!content || typeof content !== 'string') {
      return false;
    }

    const deltaPart = bufferText + content;

    // ========== 第一步：检测开始标志 ==========
    if (!inSchemaStream) {
      const detectedType = detectSchemaStart(deltaPart);
      
      // 如果检测到完整标志
      if (detectedType) {
        const currentFlag = detectedType === 'json-patch' ? jsonPatchFlag : schemaJsonFlag;
        const matchPart = deltaPart.match(new RegExp(currentFlag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))?.[0];
        
        if (!matchPart) {
          // 标志不完整，缓存
          bufferText = deltaPart;
          return true;
        }

        chatMessage.content += deltaPart;
        const trimmedDelta = deltaPart.trim();
        const [markdownPart, schemaPart] = trimmedDelta.split(matchPart);

        // 如果有前置的 markdown 内容，更新或添加 markdown 消息
        if (markdownPart) {
          const lastMessage = chatMessage.messages[chatMessage.messages.length - 1];
          if (lastMessage && lastMessage.type === 'markdown') {
            lastMessage.content += markdownPart;
          } else {
            chatMessage.messages.push({
              type: 'markdown',
              content: markdownPart,
              input,
              cardId,
            });
          }
        }

        // 添加新的 schema 消息
        chatMessage.messages.push({
          type: detectedType,
          content: schemaPart,
          input,
          cardId,
        });

        inSchemaStream = true;
        currentStreamType = detectedType;
        bufferText = '';
        return true;
      }

      // 如果检测到不完整的标志，缓存起来
      if (hasIncompleteFlag(deltaPart)) {
        bufferText = deltaPart;
        return true;
      }
    }

    // ========== 第二步：检测结束标志 ==========
    if (inSchemaStream && isSchemaJsonEnd(deltaPart)) {
      const matchFlag = /(\n\s*)?```/;
      const matchPart = deltaPart.match(matchFlag)?.[0];
      
      if (!matchPart) {
        bufferText = deltaPart;
        return true;
      }

      chatMessage.content += deltaPart;
      const trimmedDelta = deltaPart.trim();
      const [schemaPart, markdownPart] = trimmedDelta.split(matchPart);

      // 更新最后一个 schema 消息的内容
      const lastMessage = chatMessage.messages[chatMessage.messages.length - 1];
      if (lastMessage && (lastMessage.type === 'json-patch' || lastMessage.type === 'schema-card')) {
        lastMessage.content += schemaPart;
      } 

      // 如果有后续的 markdown 内容，添加新的 markdown 消息
      if (markdownPart) {
        chatMessage.messages.push({
          type: 'markdown',
          content: markdownPart,
          input,
          cardId,
        });
      }

      inSchemaStream = false;
      currentStreamType = null;
      bufferText = '';
      return true;
    }

    // ========== 第三步：处理流式内容 ==========
    bufferText = '';

    // 流式返回 schema 中
    if (inSchemaStream) {
      chatMessage.content += deltaPart;
      const lastMessage = chatMessage.messages[chatMessage.messages.length - 1];
      if (lastMessage && (lastMessage.type === 'json-patch' || lastMessage.type === 'schema-card')) {
        lastMessage.content += deltaPart;
      }
      return true;
    }

    // 普通 markdown 内容
    // 在渲染之前，检查是否可能是不完整的标志
    if (hasIncompleteFlag(deltaPart)) {
      bufferText = deltaPart;
      return true;
    }

    chatMessage.content += deltaPart;
    const lastMessage = chatMessage.messages[chatMessage.messages.length - 1];
    if (lastMessage?.type === 'markdown') {
      lastMessage.content += deltaPart;
    } else {
      chatMessage.messages.push({ type: 'markdown', content: deltaPart, input, cardId });
    }

    return false;
  };

  return {
    handleSchemaStream,
    clearSchemaState,
  };
}
