/**
 * 从完整模型输出中提取 ```schemaJson ...``` 代码块内容。
 */
export function extractSchemaJsonBlock(content: string): string | null {
  const match = content.match(/```schemaJson\s*([\s\S]*?)```/);
  if (!match) {
    return null;
  }
  return match[1].trim();
}
