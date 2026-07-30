import type { JsonSchema7Type } from 'zod-to-json-schema';

export interface IGenPromptAction {
  name: string;
  description?: string;
  parameters?: JsonSchema7Type;
  return?: JsonSchema7Type;
  async?: boolean;
}

export function genCustomActionsPrompt(actionDefinitions: IGenPromptAction[]) {
  if (!actionDefinitions?.length) {
    return '';
  }

  return `
## Action 定义

以下是一些 Action 的定义：

\`\`\`json
${JSON.stringify(actionDefinitions, null, 2)}
\`\`\`

- 如果需要使用 \`Action\`，直接写 \`Action\` 的名称即可，不需要具体实现
- \`Action\` 的参数需要根据 \`Action\` 的定义来填写
- \`Action\` 的 \`return\` 为可选字段，描述返回值结构；省略时表示无返回值；\`async\` 为可选字段，默认为 \`false\`，为 \`true\` 时表示异步 Action，\`this.callAction\` 会返回 Promise
- 发起 \`Action\` 调用可以在 \`JSFunction\` 里通过 \`this.callAction(actionName, params)\` 来调用

**示例：**

\`\`\`json
{
  "componentName": "span",
  "props": {
    "onClick": {
      "type": "JSFunction",
      "value": "function() { this.callAction('continueChat', { message: '继续对话' }); }"
    }
  },
  "children": ["点击继续对话"]
}
\`\`\`

**异步示例：**

\`\`\`json
{
  "methods": {
    "handleGetData": {
      "type": "JSFunction",
      "value": "function() { this.callAction('getData').then((res) => { this.state.tableData = res.data; }); }"
    },
    "handleSubmit": {
      "type": "JSFunction",
      "value": "async function() { const valid = await this.callAction('validateCustomForm', { formData: this.state.formData }); if (valid) { this.callAction('continueChat', { message: '继续对话' }); } }"
    }
  }
}
\`\`\`
`;
}
