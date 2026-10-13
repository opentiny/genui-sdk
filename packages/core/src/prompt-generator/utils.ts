import type { IUtilsMeta } from '../material/materials-meta';

/** 单行类型用行内代码，多行类型（如类声明）用缩进代码块 */
function formatTypeSchema(typeSchema: string): string {
  if (!typeSchema.includes('\n')) {
    return `\`${typeSchema}\``;
  }
  const indented = typeSchema.split('\n').map((line) => `  ${line}`).join('\n');
  return `\`\`\`ts\n${indented}\n  \`\`\``;
}

export function genUtilsPrompt(utils: IUtilsMeta[] = []) {
  if (utils.length === 0) {
    return '';
  }
  const items = utils
    .map((item) => {
      const lines = [`- \`this.utils.${item.name}\`：${formatTypeSchema(item.typeSchema)}`];
      if (item.description) {
        lines.push(`  - 说明：${item.description}`);
      }
      if (item.usage) {
        lines.push(`  - 示例：\`${item.usage}\``);
      }
      return lines.join('\n');
    })
    .join('\n');
  return `## 可用工具（utils）

页面可直接在 \`JSFunction\` 或 \`JSExpression\` 中通过 \`this.utils.xxx\` 调用以下工具，**无需在 schema 中声明 utils 字段**：

${items}
`;
}
