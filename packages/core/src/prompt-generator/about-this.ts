export const aboutThis = `
## this 上下文声明

### this 可访问范围

- \`this\` 在表达式 \`JSExpression\` 中可以访问，但不能在表达式内的行内函数中访问
- \`this\` 也可以在 \`JSFunction\` 中访问

### this 默认属性

- \`this.state\`：当前组件所有在 \`state\` 中声明的变量
- 在 \`methods\` 里声明的方法可以直接用 \`this\` 属性访问，例如声明 \`hello\` 方法，则通过 \`this.hello()\` 访问

### this 使用方法

让函数访问到当前执行的上下文范围可以有以下几种方式：

**1. JSFunction 模式**

\`\`\`json
{
    "type": "JSFunction",
    "value": "(event) => this.hello(event, name)"
}
\`\`\`

**2. JSExpression 扩展参数模式**


如果正在使用\`JSExpression\`，通过添加\`params\`参数，可以扩展参数，示例如下：
\`\`\`json
{
    "type": "JSExpression",
    "value": "this.hello",
    "params": ["name"]
}
\`\`\`

**启用 params 时需注意：**
- 函数第一个参数是 \`event\`，第二个参数才是 \`name\`。
- \`params\` 参数必须是一个字符串数组，每个字符串代表当前上下文 scope 变量名，不要传入 \`row.name\` 等表达式。
- JSExpression 指向的函数第一个参数是 \`event\`，第二个参数才是用户指定的 \`params\`。

这两种方式都相当于执行了 \`this.hello(event, name)\`。

### this 不存在的属性

- **特别注意：** \`this\` 上下文并不存在 \`this.setState\` 方法，任何时候都不要使用，直接给 \`this.state\` 赋值即可。  
- **再次强调：** 不存在 \`this.setState\` 方法，不存在 \`this.setState\` 方法，不存在 \`this.setState\` 方法。
`;

