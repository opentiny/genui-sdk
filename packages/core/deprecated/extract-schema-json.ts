import type { ISchemaCardMessageItem, IMarkdownMessageItem } from '../src/protocols/chat';

export function extractMarkdownAndSchemaJson(input: string): (ISchemaCardMessageItem | IMarkdownMessageItem)[] {
  const result: (ISchemaCardMessageItem | IMarkdownMessageItem)[] = [];
  let cursor = 0;

  while (cursor < input.length) {
    const startFlag = '```schemaJson';
    const start = input.indexOf(startFlag, cursor);
    const prefixLen = startFlag.length;

    if (start === -1) {
      // 没有schemaJson，全是文字
      const text = input.slice(cursor).trim();
      if (text) result.push({ type: 'markdown', content: text });
      break;
    }

    // 提取前面的文字
    const textPart = input.slice(cursor, start).trim();
    if (textPart) result.push({ type: 'markdown', content: textPart });

    // 查找结束标记 ```
    const endMatch = input.slice(start + prefixLen).match(/(\n\s*)```/);
    const end = endMatch?.index ? start + prefixLen + endMatch.index + endMatch[1].length : -1;

    let jsonText: string;
    if (end === -1) {
      // 未闭合的schemaJson，取到文本末尾
      jsonText = input.slice(start + prefixLen).trim();
      cursor = input.length; // 跳出循环
    } else {
      jsonText = input.slice(start + prefixLen, end).trim();
      cursor = end + 3;
    }

    result.push({ type: 'schema-card', content: jsonText });
  }

  return result;
}
