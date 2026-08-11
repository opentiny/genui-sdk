# Vue 集成指南

本指南涵盖将 GenUI SDK 集成到 Vue 3 项目中的选型与 skill 增量说明。安装与逐步操作见在线文档。

## 集成模式

### 模式 1：GenuiChat（推荐快速开始）

- **概况**：集成对话组件，内置会话管理、流式返回与生成状态；须通过 `GenuiConfigProvider` 注入 `materials`。
- **适用**：最快落地完整 AI 聊天界面。
- **详细步骤**：[快速开始](https://docs.opentiny.design/genui-sdk/guide/quick-start)

### 模式 2：GenuiRenderer（自定义 UI）

- **概况**：`GenuiRenderer` 只负责将 schema 渲染为 UI；需自建输入、消息流，并自行完成 **SSE 帧解析** 与 **schema 文本提取**（两步分离，不可混用）。
- **适用**：需要完全自定义界面或与现有 UI 深度集成。
- **详细步骤**：[使用 Renderer 组件](https://docs.opentiny.design/genui-sdk/guide/start-with-renderer)

## 流式数据处理流程

模式 2 须按以下顺序处理流式响应（`PatternExtractor` **不**解析 SSE，只消费已解码的 text delta）：

1. **读取流**：`fetch(..., { stream: true })`，用 `ReadableStream` 累积 buffer
2. **解析 SSE 帧**：按 `\n` 切行，识别 `data:` 前缀，处理 `[DONE]`，`JSON.parse` 每帧 payload
3. **提取 text delta**：从 `chunk.choices?.[0]?.delta?.content` 取出文本片段（无 content 则跳过）
4. **PatternExtractor**：对每个 text delta 调用 `patternExtractor.handleContent(content)`；在 `onHandledWrite` 回调中累积 schema 字符串（`` ```schemaJson `` 块由 core 默认 `SchemaJsonPattern` 识别）
5. **更新 UI**：将累积 schema 绑定到 `GenuiRenderer` 的 `content`；请求进行中设 `generating={true}`，结束或收到 `[DONE]` 后设 `generating={false}`

> SSE 解析 = 传输层（OpenAI 兼容格式）；PatternExtractor = 内容层（从 LLM 文本中提取 schema / markdown）。

```typescript
// 伪代码骨架 — 完整实现见在线文档
const patternExtractor = new PatternExtractor({
  onNormalWrite: () => {},
  onHandledWrite: (schemaChunk) => { schema.value += schemaChunk; },
});

for await (const line of readSseLines(response.body)) {
  // 1–3: SSE — 解析帧、跳过 [DONE]、提取 delta.content
  const content = parseOpenAiSseDelta(line);
  if (!content) continue;

  // 4: PatternExtractor — 仅处理文本 delta
  patternExtractor.handleContent(content);
}
// 5: generating.value = false
```

完整参考实现见 [fetch-schema-stream 示例](https://docs.opentiny.design/genui-sdk/guide/start-with-renderer#使用-fetch-请求服务-处理流式返回) 及 skill 内 [`../examples/renderer/`](../examples/renderer/) 示例（构建时从 docs 同步）。

## 按需导入

`@opentiny/genui-sdk-vue` 提供 `chat`、`renderer`、`config-provider` 等子路径，可按需引入以减小打包体积。详见 [快速开始 - 按需引入](https://docs.opentiny.design/genui-sdk/guide/quick-start#按需引入)。

## 兼容组件

v1.3.0 起物料与核心解耦；从更早版本升级且希望零配置迁移时，可使用内置默认物料的 Legacy 组件（无需 `GenuiConfigProvider`）。详见 [GenuiChat Legacy 兼容说明](https://docs.opentiny.design/genui-sdk/components/chat#兼容组件-genuilegacychat)。

## 常见问题

### 物料未注入

**问题**: 组件无法正确渲染

**解决方案**: 确保你已经用 `GenuiConfigProvider` 包装组件并注入了物料:

```vue
<GenuiConfigProvider :materials="materials">
  <!-- Your components here -->
</GenuiConfigProvider>
```

### 流式不工作

**问题**: UI 在流式传输期间不更新

**解决方案**（按 pipeline 顺序排查）:
1. 后端是否返回 OpenAI 兼容 SSE（`data:` 行、请求体 `stream: true`）
2. 应用是否**先**解析 SSE 帧并提取 `delta.content`（而非直接把原始字节传给 `PatternExtractor`）
3. 是否对每个 text delta 调用 `PatternExtractor.handleContent`
4. `GenuiRenderer` 的 `content` 是否在 `onHandledWrite` 中持续更新
5. `generating` 是否在流式期间为 `true`、结束后为 `false`

## 下一步

- 了解 [自定义组件](../examples/renderer/custom-components.md)
- 探索 [自定义动作](../examples/renderer/custom-actions.md)
- 配置 [必需完整字段选择器](../examples/renderer/required-complete-field-selectors.md) 以获得更好的流式体验
- 查看 [状态管理示例](../examples/renderer/state.md)
