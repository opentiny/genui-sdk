export const genCustomActionsPrompt = (actionDefinitions: any[]) => actionDefinitions?.length > 0 ? `
以下是一些Action的定义：
${JSON.stringify(actionDefinitions, null, 2)}

如果需要使用Action可以直接写着Action的名称，不需要具体实现。
Action的参数需要根据Action的定义来填写.
发起Action调用可以在 JSFunction 里通过 \`this.callAction(actionName, params)\`来调用。
例如：
\`\`\`
{
  "componentName": "span",
  "props": {
    "onClick": {
      "type": "JSFunction",
      "value": "function() { this.callAction('continueChat', { message: '继续对话' }); }"
    }
  },
  children: ["点击继续对话"]
}
\`\`\`
` : '';
