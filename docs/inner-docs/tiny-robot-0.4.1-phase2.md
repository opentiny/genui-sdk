# Tiny Robot 0.4.1 升级 — 阶段 2 工作总结

> 文档日期：2026-06-23  
> 关联计划：[tiny-robot-0.4.1-upgrade-plan.md](./tiny-robot-0.4.1-upgrade-plan.md)  
> 前置文档：[tiny-robot-0.4.1-phase0-phase1-工作总结.md](./tiny-robot-0.4.1-phase0-phase1-工作总结.md)  
> 当前 tiny-robot 版本：**0.4.1**

---

## 一、阶段目标与完成情况

阶段二目标（计划 **P0**）：**Bubble 渲染器迁移** — 在 `chat-v2` 中补齐除 Schema 卡片外的消息类型 UI，使思考过程、工具调用、Markdown、错误文本、流式 loading 提示可正常展示。

| 计划项 | 状态 |
|--------|------|
| `contentRendererMatches` 注册自定义 type | ✅ |
| `contentResolver` 解析 `messages` 字段 | ✅（含 reasoning 合并/回退） |
| markdown / reasoning / tool 渲染 | ✅（markdown、reasoning 自研；tool 复用 legacy 组件） |
| `showMessages` loading 机制 | ✅（过渡实现，见 §五） |
| `schema-card` → `GenuiRenderer` | ❌ 留阶段三 |
| `templateData` 渲染器 | ❌ 留阶段四 |

---

## 二、新增文件

```
packages/frameworks/vue/src/chat-v2/
├── composables/
│   └── useMarkdownHtml.ts              # markdown-it + dompurify 异步渲染 composable
└── renderers/
    ├── CustomTextItemRenderer.vue      # type: custom-text
    ├── ReasoningItemRenderer.vue       # type: reasoning（折叠 + markdown 正文）
    ├── ToolItemRenderer.vue            # type: tool（适配层 → chat/renderer/ToolRenderer.vue）
    ├── ErrorTextItemRenderer.vue       # type: error-text（适配层 → chat/ErrorText.vue）
    └── LoadingTextItemRenderer.vue     # type: loading-text（适配层 → GeneratingComponent）
```

### 2.1 渲染器设计原则

- 统一使用 0.4.x `BubbleContentRendererProps` + `useMessageContent(props)` 读取当前 content 项
- **不复用** `BubbleRenderers.Markdown`：GenUI 流式数据为 `{ type: 'markdown', content }`，内置 Markdown 渲染器只认 `type: 'text'` 的 `text` 字段
- **不复用** `BubbleRenderers.Reasoning` / `Tool`：内置组件读 `message.reasoning_content` / `message.tool_calls`，GenUI 使用 `messages[]` 里的 `{ type: 'reasoning' | 'tool' }`
- `tool` / `error-text` / `loading-text` 通过薄适配层复用 `chat/` 下已有 Vue 组件，避免重复实现

### 2.2 `useMarkdownHtml.ts`

抽取 Markdown 异步加载与渲染逻辑，供 `MarkdownItemRenderer`、`ReasoningItemRenderer` 共用：

- `onMounted` 动态 import `markdown-it`、`dompurify`
- `ready` 标志 + `watch(source)` 触发重渲染（修复阶段一「库加载后不刷新、一直显示纯文本」的问题）

---

## 三、修改文件说明

### 3.1 `contentRendererMatches.ts`

**注册的 content type：**

| type | 渲染器 | 优先级 |
|------|--------|--------|
| `markdown` | `MarkdownItemRenderer` | NORMAL |
| `custom-text` | `CustomTextItemRenderer` | NORMAL |
| `reasoning` | `ReasoningItemRenderer` | CONTENT（高于内置 reasoning 匹配） |
| `tool` | `ToolItemRenderer` | NORMAL |
| `error-text` | `ErrorTextItemRenderer` | NORMAL |
| `loading-text` | `LoadingTextItemRenderer` | NORMAL |

**`genuiContentResolver` / `buildResolvedContent`：**

1. 优先使用 `message.messages[]`
2. `mergeReasoningItems()`：多条 `{ type: 'reasoning' }` 合并为一条（避免 `reasoning_content` 字段 + think 标签双路径产生重复「已思考」）
3. 若 `messages[]` 中无 reasoning 项，但消息顶层存在 `reasoning_content` 字符串，则合成一条 reasoning 项（兼容仅顶层字段的历史/原生格式）

> **注意**：流式过程中**不再**同步写入 `message.reasoning_content`（曾在 `genuiStreamHandler` 中短暂添加，会与 `messages[]` 叠加触发 tiny-robot 内置 Reasoning 重复渲染，已移除）。

### 3.2 `GenuiChat.vue`

**新增 `showMessages` computed**（展示层临时拼装，不写入 IndexedDB）：

```ts
// 逻辑概要
if (isProcessing) {
  // 1. 末条为 user / 无消息 → 追加 { role: 'assistant', loading: true } 假气泡
  // 2. 末条为 assistant → 在 messages[] 副本末尾注入 { type: 'loading-text', emitter, ... }
}
return messages
```

**样式补充（对齐 legacy）：**

- `:deep(.tr-bubble__loading)` 间距
- assistant 气泡透明背景（`.tr-bubble__box`）
- 相邻 tool 卡片间距

**移除**：`--thinking-display` CSS 变量及对 reasoning/markdown 的批量隐藏（该逻辑曾误伤 markdown 展示，见 §六）。

`TrBubbleList` 绑定 `:messages="showMessages"`，滚底 watch 同样监听 `showMessages`。

### 3.3 `chat/response-handler.ts`（共享模块，legacy + v2 共用）

| 改动 | 说明 |
|------|------|
| `getReasoningContent()` | 同时读取 `choice.delta.reasoning_content` 与 `choice.message.reasoning_content` |
| reasoning handler | 使用上述 helper；新建 reasoning 项改为 `reactive({ type: 'reasoning', ... })` |

### 3.4 `renderers/MarkdownItemRenderer.vue`

- 重构为使用 `useMarkdownHtml` composable
- 逻辑未变：匹配 `markdown` / `custom-text` 的 `content` 字段

### 3.5 `renderers/ReasoningItemRenderer.vue`

- 折叠 UI（对齐 legacy `ReasoningRenderer.vue` 交互）
- `thinking === true` 时自动展开详情
- 正文走 `useMarkdownHtml` 渲染

---

## 四、数据流（阶段二视角）

```
SSE chunk
  → genuiStreamHandler.onCompletionChunk（不调 runDefault）
  → defaultResponseHandlers 链
       reasoning  → messages[] += { type: 'reasoning', content, thinking }
       tool       → messages[] += { type: 'tool', name, status, content, ... }
       content    → messages[] += { type: 'markdown' | 'schema-card', ... }
  → onTurnEnd → handler.end + notification done

TrBubbleList
  → contentResolver: genuiContentResolver（合并/回退 reasoning）
  → split 模式逐项匹配 contentRendererMatches
  → 对应 *ItemRenderer 渲染
```

`schema-card` 仍由 handler 写入 `messages[]`，但**尚无**对应渲染器 → 阶段三前表现为空白（不做 text 兜底）。

---

## 五、`showMessages` 过渡方案说明

当前实现从 legacy `GenuiChat.legacy.vue` 1:1 迁移，**刻意保留**至后续重构：

| 分支 | 作用 |
|------|------|
| 追加 `{ loading: true }` 假 assistant | 首包到达前的等待态（与 kit 自带 `message.loading` 存在重叠，见技术债） |
| 注入 `loading-text` | 流式过程中 `GeneratingComponent` shimmer（依赖 `emitter` notification） |

**已知局限（待 refactor）：**

- 职责在 view computed，与 `genuiStreamHandler` 分离
- `loading-text` 通过 content item 传递 `emitter` / `message` / `showThinkingResult`，属 hack
- 早期可能同时出现 kit 内置 Loading 与 `loading-text`

**建议重构方向（阶段五前）：**

1. 去掉第一个 append 分支，仅依赖 kit 的 `message.loading`
2. 在 `genuiStreamHandler` 首包 push / `onTurnEnd` 移除 `loading-text`
3. `GeneratingComponent` 改用 `provide/inject` 获取 emitter
4. `GenuiChat` 直接 `:messages="messages"`，删除 `showMessages`

---

## 六、阶段内问题修复记录

| 现象 | 原因 | 处理 |
|------|------|------|
| Markdown 显示为纯文本 | `MarkdownItemRenderer` 异步加载后未触发重渲染 | `useMarkdownHtml` + `watch` |
| Markdown 完全不显示 | `--thinking-display: none` 误隐藏 `[data-type='markdown']` | 移除该 CSS；`showThinkingResult` 仅影响 loading-text 行为 |
| reasoning 不显示 | ① CSS 隐藏 ② 只读 `delta.reasoning_content` ③ 顶层字段未进 resolver | 修复 CSS / handler / resolver；**不**同步写 `message.reasoning_content` |
| 两个「已思考」 | `messages[]` reasoning + `message.reasoning_content` 触发内置 Reasoning 双渲染 | 移除 stream 同步；`mergeReasoningItems` 去重 |
| 注释 contentResolver 字符串回退后 markdown 仍正常 | AI 回复走 `messages[]` 的 `{ type: 'markdown' }`，不经过字符串回退 | 文档说明；未保留该回退 |

---

## 七、文件变更清单

### 新增

```
packages/frameworks/vue/src/chat-v2/composables/useMarkdownHtml.ts
packages/frameworks/vue/src/chat-v2/renderers/CustomTextItemRenderer.vue
packages/frameworks/vue/src/chat-v2/renderers/ReasoningItemRenderer.vue
packages/frameworks/vue/src/chat-v2/renderers/ToolItemRenderer.vue
packages/frameworks/vue/src/chat-v2/renderers/ErrorTextItemRenderer.vue
packages/frameworks/vue/src/chat-v2/renderers/LoadingTextItemRenderer.vue
docs/inner-docs/tiny-robot-0.4.1-phase2-工作总结.md   # 本文档
```

### 修改

```
packages/frameworks/vue/src/chat-v2/contentRendererMatches.ts
packages/frameworks/vue/src/chat-v2/GenuiChat.vue
packages/frameworks/vue/src/chat-v2/renderers/MarkdownItemRenderer.vue
packages/frameworks/vue/src/chat/response-handler.ts
```

### 未改动（阶段二范围外）

```
packages/frameworks/vue/src/chat-v2/genuiStreamHandler.ts   # 除 reasoning 同步实验已回退外，与阶段一一致
packages/frameworks/vue/src/chat-v2/useGenuiConversation.ts
schema-card / GenuiRenderer 相关
```

---

## 八、当前可用 / 不可用功能（相对阶段一）

### ✅ 阶段二新增可用

- 流式 **Markdown** 正常 HTML 渲染
- **思考过程**（`reasoning` / `reasoning_content` / think 标签）折叠展示
- **工具调用**（`tool`）状态卡片 + JSON 高亮
- 请求 **错误**（`error-text`，含 stream onError）
- 流式 **loading-text** shimmer（`GeneratingComponent` + notification）
- 首包前 **Loading**  spinner（假消息 + kit 内置 Loading 渲染器）

### ❌ 仍不可用（后续阶段）

| 功能 | 计划阶段 |
|------|----------|
| Schema 卡片 / `GenuiRenderer` | 阶段三 |
| `continueChat` / `saveState` / `CUSTOM_CONTEXT` | 阶段三 |
| 图片上传 / `templateData` | 阶段四 |
| Playground footer 插槽、`showMessages` 重构 | 阶段五 |
| Template Chat 完整迁移 | 阶段六 |
| 删除 patch / legacy | 阶段七 |

---

## 九、验收建议

```bash
pnpm --filter @opentiny/genui-sdk-vue build
pnpm --filter genui-sdk-playground-web dev
```

手动检查：

1. 普通对话 → Markdown 格式正确
2. 支持 `reasoning_content` 的模型 → 单个「已思考/正在思考」块，可展开
3. 工具调用 demo → tool 卡片 running → success
4. 故意触发错误 → error-text 卡片
5. 流式生成中 → loading 动画 / loading-text（`showThinkingResult: false` 时仍应有 loading-text）
6. Schema 生成 → 仍为空白（预期，阶段三处理）

---

## 十、建议下一步：阶段三

1. `schema-card` → `SchemaCardRenderer` / `GenuiRenderer`
2. `continueChatAction` / `saveStateAction`、`CUSTOM_CONTEXT` provide
3. `lastSchemaCardId` + `generating` 态
4. `rendererSlots`、customComponents / customActions 透传
