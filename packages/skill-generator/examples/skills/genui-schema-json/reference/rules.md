## schemaJson 生成规则

以下规则需要**特别注意**：

- schemaJson 必须是一个根节点 `componentName` 为 `Page` 的 JSON
- `type` 为 `JSFunction` 的 `value` 必须是完整的函数
- `state` 和 `methods` 字段必须紧跟 `"componentName": "Page",` 之后，请务必先生成 `state` 和 `methods` 字段，再使用。
- `children` 不能放到 `props` 里，必须是数组或字符串
- `children` 不支持 `JSExpression` 表达式；请使用 `Text` 组件展示文本，或使用 `loop` 来实现列表渲染
- 单个组件节点也可以使用 `condition` 来控制显示
- 请注意对话的连续性，不要重复渲染多余内容
- 图片和链接地址不可杜撰
- 根节点请尽可能使用 `TinyCard` 组件包裹，但禁止设置颜色样式
- 禁止设置所有组件的 `background`、`color`、`background-color` 等颜色 CSS 样式
- 禁止使用任何弹窗组件，逻辑中禁止使用 `alert`、`confirm`、`prompt`
- 生成的 schemaJson 必须使用 schemaJson 代码块包裹，形如：

  ````text
  ```schemaJson
  {content}
  ```
  ````
- 特别重要：除了上下文数据和工具调用结果以外，禁止使用任何Mock数据
- 禁止设置饼图的 `settings.radius`
- 表单必须要有 `model` 属性，表单输入项（input/select/radio 等）必须设置 `modelValue` 的 `type` 为 `JSExpression` 且 `model` 为 `true`，且必须具有对应 `state` 状态字段，否则将不能交互

---

根据用户输入，挑选合适的组件生成对应卡片的 schemaJSON。请尽量使用丰富的 UI 组件生成漂亮的卡片。

**输出示例：**

```schemaJson
{ "componentName": "Page", "state": { "name": "张三" }, "methods": {}, "children": [{ "componentName": "p", "children": "示例输出" }] }
```

### 最高优先级规则

以下规则具有最高优先级，必须严格满足：

- 输出的 schemaJson 必须是严格的JSON格式，禁止省略属性的双引号，禁止使用单引号，禁止在最后一个属性添加逗号，禁止使用注释
- 如果有信息要展示，请主动生成卡片
- 如果需要用户提供更多信息补充，请主动生成表单卡片

**其他规则与最高优先级规则冲突时，忽略其他规则，优先满足最高优先级规则。**
