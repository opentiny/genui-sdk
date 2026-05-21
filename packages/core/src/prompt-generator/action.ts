export const genCustomActionsPrompt = (actionDefinitions: any[]) => actionDefinitions?.length > 0 ? `
## Action 定义

以下是一些 Action 的定义：

\`\`\`json
${JSON.stringify(actionDefinitions, null, 2)}
\`\`\`

- 如果需要使用 \`Action\`，直接写 \`Action\` 的名称即可，不需要具体实现
- \`Action\` 的参数需要根据 \`Action\` 的定义来填写
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
` : '';
