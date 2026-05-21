/**
 * 从完整模型输出中提取 ```schemaJson ...``` 代码块内容。
 * @param content 模型完整文本输出
 * @returns 提取出的 schemaJson 字符串；未命中时返回 null
 */
export function extractSchemaJsonBlock(content: string): string | null {
  const match = content.match(/```schemaJson\s*([\s\S]*?)```/);
  if (!match) {
    return null;
  }
  return match[1].trim();
}
