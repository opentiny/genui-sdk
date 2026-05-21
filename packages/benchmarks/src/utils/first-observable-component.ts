/**
 * 是否已出现 `TinyCard` 节点的完整 `"componentName": "TinyCard"` 声明。
 * 与流式输出配合：用于记录首块业务容器在 schema 文本中的出现时刻。
 */
export function hasTinyCardComponentDeclaration(text: string): boolean {
  return /"componentName"\s*:\s*"TinyCard"/.test(text);
}
