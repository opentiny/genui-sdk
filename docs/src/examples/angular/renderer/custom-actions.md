# Renderer 组件 - 自定义 Actions

自定义 Actions 可以自行编写执行代码从而实现复杂的交互逻辑，需配合提示词让 LLM 输出对应 schemaJson 调用 Actions

## 给组件传递自定义 Actions

通过 `customActions` prop 向 `GenuiRenderer` 组件传递自定义动作。每个自定义 Action 需要包含以下属性：

- `name`: 动作名称
- `description`: 动作描述
- `execute`: 执行函数，接收 `params` 和 `context` 两个参数
- `params`: 参数定义数组（可选），用于描述动作接收的参数，大模型根据描述生成参数传递给`execute`第一个参数

### execute 函数参数说明

- `params`: 调用动作时传入的参数对象
- `context`: 渲染器的上下文信息，包含渲染器的状态和方法，可以通过 `context.state` 获取全局双向绑定状态

### 示例：打开新页面

<demo vue="../../../../demos/angular/renderer/custom-actions-open-page.vue"  :vueFiles="['../../../../demos/angular/renderer/custom-actions-open-page.ts']"/>

## 把自定义组件信息传给 Server

渲染器支持自定义组件后，同步修改LLM生成对话服务，把自定义的Actions信息发送给大模型。

```ts {9-31}
const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{ role: 'user', content: userInput }],
    model: 'deepseek-v3.2',
    stream: true,
    metadata: {
      tinygenui: JSON.stringify({
        framework: 'Angular',
        customActions: [
          {
            name: 'openPage',
            description: '打开新页面',
            parameters: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: '要打开的页面地址',
                },
                target: {
                  type: 'string',
                  description: '打开方式，可选值：_self（当前窗口）、_blank（新窗口）',
                },
              },
              required: ['url', 'target'],
            },
          }
        ]
      }),
    },
  }),
});
```
