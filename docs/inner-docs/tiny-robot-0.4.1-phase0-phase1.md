# Tiny Robot 0.4.1 升级 — 阶段 0 / 阶段 1 工作总结

> 文档日期：2026-06-23  
> 关联计划：[tiny-robot-0.4.1-upgrade-plan.md](./tiny-robot-0.4.1-upgrade-plan.md)  
> 当前 tiny-robot 版本：**0.4.1**（自 0.3.3 升级）

---

## 一、整体目标与策略

本次工作的目标是将 `genui-sdk` 中的聊天能力从 **tiny-robot 0.3.x + 自研 patch 层** 迁移到 **tiny-robot 0.4.1 原生 API**，采用**渐进式替换**：

1. 新建 `chat-v2` / `genui-template-v2` 目录，逐步还原功能
2. 原实现重命名为 `*.legacy.vue`，保留对照、不再作为默认入口
3. 删除对 `tiny-robot-patch` 的运行时依赖（代码仍在仓库中，但已从包导出移除）
4. **不兼容**旧版 IndexedDB 会话数据，使用新库名 `genui-ai-v2`

---

## 二、阶段 0：准备工作（已完成）

### 2.1 升级计划文档

- 新增：`docs/inner-docs/tiny-robot-0.4.1-upgrade-plan.md`
- 内容包含：
  - `GenuiChat.vue` 全量功能清单（48 项）
  - `GenuiTemplateChat.vue` 功能清单（12 项）
  - 0.3.x → 0.4.x API 对照表
  - 分 7 个阶段的迁移路线与验收标准

### 2.2 目录与入口切换

| 操作 | 路径 |
|------|------|
| 原 GenuiChat 重命名 | `packages/frameworks/vue/src/chat/GenuiChat.legacy.vue` |
| 新建 v2 占位 / 实现 | `packages/frameworks/vue/src/chat-v2/` |
| 导出入口改指 v2 | `packages/frameworks/vue/src/chat/index.ts` → `export { GenuiChat } from '../chat-v2'` |
| 原 TemplateChat 重命名 | `sites/playground/web/src/components/genui-template/GenuiTemplateChat.legacy.vue` |
| 新建 Template v2 | `sites/playground/web/src/components/genui-template-v2/GenuiTemplateChat.vue` |
| GenuiTemplate 引用 v2 | `GenuiTemplate.vue` import 改为 `genui-template-v2` |

### 2.3 移除 patch 公开导出

`packages/frameworks/vue/src/chat/index.ts` 中已**不再导出**：

- `tiny-robot-patch/*`（`useConversation`、`useMessage`、`IndexedDBStrategy` 等）
- `GenuiChatLegacy`

> `tiny-robot-patch` 源码仍留在 `src/chat/tiny-robot-patch/`，供对照；构建时通过 `vite.config.ts` 的 `dts.exclude` 排除，避免类型错误。

---

## 三、阶段 1：基础设施（已完成）

阶段一目标：**最小可运行聊天**——文本发送、流式 Markdown、会话自动持久化；**不含** Schema 卡片、图片上传、自定义 footer 插槽等。

### 3.1 依赖版本升级

以下包的版本由 `0.3.3` 升至 **`0.4.1`**：

| 包名 | 修改文件 |
|------|----------|
| `@opentiny/tiny-robot` | `packages/frameworks/vue/package.json` |
| `@opentiny/tiny-robot-kit` | 同上 |
| `@opentiny/tiny-robot-svgs` | 同上 |
| 上述三者 | `sites/playground/web/package.json` |

新增直接依赖（Markdown 渲染）：

- `markdown-it@^14.1.0`
- `dompurify@^3.3.1`

### 3.2 新建 `chat-v2` 核心模块

#### `types.ts`

定义 `GenuiChatRuntimeOptions`，对齐原 `GenuiChat` props 中的 LLM / 自定义组件 / actions 等运行时配置。

#### `createGenuiResponseProvider.ts`

**替代**：`AIClient` + `CustomModelProvider extends BaseModelProvider`

**做法**：

- 继续调用现有 `chat/chat-api.ts` 的 `chat()` 发起 HTTP 请求
- 使用 0.4.x 提供的 `sseStreamToGenerator(response, { signal })` 将 SSE 转为 `AsyncGenerator`
- 作为 `useMessage({ responseProvider })` 的数据源

#### `genuiStreamHandler.ts`

**替代**：0.3.x 的 `events.onReceiveData` + `preventDefault()` 模式

**做法**：

- 在 `useMessage` 的 `onCompletionChunk` 钩子中**不调用** `runDefault()`，完全走自定义流式解析
- 复用原有 `chat/response-handler.ts` 中的 `defaultResponseHandlers` 链（init / reasoning / tool / content / markdown / schema-card 等）
- 在首包时给 assistant 消息挂上 `messages: []` 数组，并执行各 handler 的 `start`
- 每个 SSE chunk 走 handler 的 `match` + `handler`
- `onTurnEnd` 时执行 handler 的 `end`，并 `emitter.emit('notification', { type: 'done' })`
- `onError` 时向 `messages` 追加 `{ type: 'error-text', content }`
- 禁用内置 `thinkingPlugin`、`lengthPlugin`（避免与 GenUI 自研解析冲突）

#### `useGenuiConversation.ts`

**替代**：`tiny-robot-patch/useConversation`

**做法**：

```ts
useConversation({
  useMessageOptions: { responseProvider, plugins, onCompletionChunk },
  storage: indexedDBStorageStrategyFactory({ dbName: 'genui-ai-v2' }),
  autoSaveMessages: true,
  autoSaveThrottle: 1000,
})
```

**业务层变化**：

| 0.3.x（patch） | 0.4.x（当前） |
|----------------|---------------|
| `messageManager.value.inputMessage` | 组件内 `ref('')` 自行维护 |
| `messageManager.value.sendMessage()` | `engine.sendMessage()` |
| 多处手动 `saveConversations()` | `autoSaveMessages: true` 自动节流保存 |
| `messageState.status` / `GeneratingStatus` | `engine.isProcessing` + `requestState` |
| `state` + `messageManager` | `legacyConversation` 适配层（见下） |

**Legacy 适配层**（供 playground 历史记录等未迁移代码使用）：

- 导出类型：`LegacyUseConversationReturn`、`LegacyMessageManager`
- `getConversation()` 返回结构与 0.3.x 接近：`state`、`messageManager`、`createConversation`、`switchConversation`、`saveConversations` 等
- `messageManager.isProcessing` 替代 `GeneratingStatus.includes(status)`

#### `contentRendererMatches.ts` + `renderers/MarkdownItemRenderer.vue`

**替代**：0.3.x `TrBubbleProvider` 的 `contentRenderers: Record<type, fn>`

**做法**：

- 使用 0.4.x `contentRendererMatches` + `BubbleRendererMatchPriority`
- `genuiContentResolver(message)`：优先取 `message.messages` 数组，否则取 `message.content`
- `TrBubbleList` 设置 `content-render-mode="split"`，按 `messages[]` 逐项渲染
- `type === 'markdown'` / `'custom-text'` 命中 `MarkdownItemRenderer`（`markdown-it` + `dompurify`）

> 0.4.x 已移除 `BubbleMarkdownContentRenderer`，故自研 `MarkdownItemRenderer`。

#### `GenuiChat.vue`（v2 完整骨架）

已实现：

| 能力 | 说明 |
|------|------|
| 气泡列表 | `TrBubbleList :messages` + `:role-configs`（非旧 `:items` + `:roles`） |
| 角色头像 | `IconAi` / `IconUser`，支持 `props.roles` 合并 |
| 空状态 | `#empty` 插槽 |
| 发送框 | `TrSender`：v-model、placeholder、loading、字数限制 1000、clear、submit、cancel |
| 流式状态 | `isProcessing` 控制 placeholder / loading / 滚底按钮动画 |
| 滚底 | `scrollEnd` + 节流 400ms + 切换会话 `scrollToBottomWithRetry` |
| 暗色主题 | `genuiConfig.theme === 'dark'` + legacy 样式变量 |
| 首条消息改标题 | `setConversationTitle`（前 20 字） |
| 初始消息 | `props.messages` 注入 |
| defineExpose | `setInputMessage`、`handleNewConversation`、`getConversation`、`get/setResponseHandlers` |

**尚未实现**（后续阶段）：

- Schema 卡片 / `GenuiRenderer`
- 图片上传、`templateData`、`AttachmentsRenderer`
- `roles` 插槽（`trailer` → 0.4.x `after`）与 playground `AssistantFooter` / `UserFooter`
- `continueChat` / `saveState` / `CUSTOM_CONTEXT`
- `showMessages` 的 PROCESSING 假消息、流式 `loading-text`
- `reasoning` / `tool` / `error-text` 等 Bubble 渲染器（流式解析已有，UI 待接）

### 3.3 构建与类型调整

| 文件 | 改动 |
|------|------|
| `vite.config.ts` | `dts.exclude` 排除 `tiny-robot-patch/**`、`GenuiChat.legacy.vue` |
| `chat.types.ts` | `IBubbleSlotsProps.messageManager` 改为 `IMessageManagerBridge`，不再依赖 0.3.x `UseMessageReturn` |
| `chat/index.ts` | 导出 `LegacyUseConversationReturn` 类型 |

---

## 四、Playground 适配（阶段一附带）

### 4.1 主聊天（`App.vue` + `GenuiChat`）

- 仍使用 `@opentiny/genui-sdk-vue` 的 `GenuiChat`（已指向 v2）
- `getConversation()` / `setResponseHandlers()` 通过 legacy 适配层保持可用
- `continue-writing` 相关 handler 注入逻辑保留（依赖 `getResponseHandlers`，阶段二后需验证与 0.4.x 流式合并是否冲突）

### 4.2 会话历史（`GenuiHistory.vue`）

- `conversation` prop 类型改为 `LegacyUseConversationReturn`
- 导入/导出使用本地类型 `PersistedConversation`（`sites/playground/web/src/types/conversation.ts`）
- `TrHistory` 分组数据使用 `as any` 兼容 0.4.x `HistoryData` 类型差异

### 4.3 用户 Footer（`UserFooter.vue`）

- 移除对已废弃 `GeneratingStatus` 的依赖
- 改为 `props.messageManager?.isProcessing?.value`

### 4.4 模板模式（`useTemplate.ts`）— 临时处理

**问题**：模板仍依赖 0.3.x 的 `IndexedDBStrategy` + `useConversation({ client })`，升级后运行时报 `IndexedDBStrategy is not defined`。

**当前处理**（阶段六前的权宜之计）：

- `App.vue`：仅当 `VITE_ENABLE_TEMPLATE === 'true'` 时才向 `useTemplate` 传 `url`
- `useTemplate.ts`：移除旧 API 初始化，改为**内存 stub 会话**（`createStubConversation`），保证 UI 不崩溃
- `GenuiTemplateChat` 仍为 v2 **占位组件**，无真实模板对话能力

### 4.5 TypeScript 配置

- `tsconfig.app.json`：`exclude: ["src/**/*.legacy.vue"]`，避免 legacy 文件参与类型检查

---

## 五、文件变更清单

### 新增

```
packages/frameworks/vue/src/chat-v2/
├── GenuiChat.vue
├── index.ts
├── types.ts
├── createGenuiResponseProvider.ts
├── genuiStreamHandler.ts
├── useGenuiConversation.ts
├── contentRendererMatches.ts
└── renderers/
    └── MarkdownItemRenderer.vue

sites/playground/web/src/components/genui-template-v2/
└── GenuiTemplateChat.vue          # 占位

sites/playground/web/src/types/
└── conversation.ts                  # PersistedConversation

docs/inner-docs/
├── tiny-robot-0.4.1-upgrade-plan.md
└── tiny-robot-0.4.1-phase0-phase1-工作总结.md   # 本文档
```

### 重命名（保留对照，非默认入口）

```
packages/frameworks/vue/src/chat/GenuiChat.vue
  → GenuiChat.legacy.vue

sites/playground/web/src/components/genui-template/GenuiTemplateChat.vue
  → GenuiTemplateChat.legacy.vue
```

### 修改

```
packages/frameworks/vue/package.json          # 0.4.1 + markdown-it/dompurify
packages/frameworks/vue/src/chat/index.ts     # 导出入口
packages/frameworks/vue/src/chat/chat.types.ts
packages/frameworks/vue/vite.config.ts
sites/playground/web/package.json
sites/playground/web/src/App.vue
sites/playground/web/src/components/UserFooter.vue
sites/playground/web/src/components/genui-template/GenuiTemplate.vue
sites/playground/web/src/components/genui-template/useTemplate.ts
sites/playground/web/src/components/genui-template/GenuiTemplateList.vue
sites/playground/web/src/components/tab-components/GenuiHistory.vue
sites/playground/web/src/components/tab-components/history-transfer/*
sites/playground/web/tsconfig.app.json
```

### 未删除（待阶段七）

```
packages/frameworks/vue/src/chat/tiny-robot-patch/   # 整目录仍存在
packages/frameworks/vue/src/chat/CustomModelProvider.ts
packages/frameworks/vue/src/chat/GenuiChat.legacy.vue
```

---

## 六、0.3.x → 0.4.x 关键 API 替换（阶段一已落地部分）

| 废弃（0.3.x） | 当前用法（0.4.x） | 落地位置 |
|---------------|-------------------|----------|
| `AIClient` + `BaseModelProvider` | `responseProvider` + `sseStreamToGenerator` | `createGenuiResponseProvider.ts` |
| `useConversation({ client })` | `useConversation({ useMessageOptions })` | `useGenuiConversation.ts` |
| `messageManager.inputMessage` | 业务层 `ref('')` | `GenuiChat.vue` |
| `saveConversations()` 手动调用 | `autoSaveMessages: true` | `useGenuiConversation.ts` |
| `GeneratingStatus` / `STATUS` | `isProcessing` | `GenuiChat.vue`、适配层 |
| patch `IndexedDBStrategy` | `indexedDBStorageStrategyFactory({ dbName: 'genui-ai-v2' })` | `useGenuiConversation.ts` |
| `TrBubbleList :items` | `:messages` | `GenuiChat.vue` |
| `:roles` | `:role-configs` | `GenuiChat.vue` |
| `contentRenderers` Map | `contentRendererMatches` | `contentRendererMatches.ts` |
| `customContentField: 'messages'` | `contentResolver` + `content-render-mode="split"` | `GenuiChat.vue` |
| `BubbleMarkdownContentRenderer` | 自研 `MarkdownItemRenderer` | `renderers/` |

---

## 七、数据存储说明

| 项目 | 值 |
|------|-----|
| 主聊天 IndexedDB 库名 | `genui-ai-v2`（0.4.x 原生结构：conversations + messages 分表） |
| 旧库 `genui-ai` / patch 单 key 存储 | **不读取、不迁移** |
| 模板库 `genui-ai-template` | 阶段六前未接入；当前 stub 无持久化 |

---

## 八、当前可用 / 不可用功能

### ✅ 阶段一可用

- Playground 主聊天：发送文本、流式 Markdown 展示
- 中止生成（Sender cancel）
- 新建会话（`handleNewConversation` / Ctrl+K）
- 会话列表 UI（历史侧边栏，基于 legacy 适配层）
- 刷新后主聊天会话自动恢复（新 DB）
- 暗色主题、滚底按钮、空状态插槽

### ❌ 阶段一尚未可用

- GenUI Schema 卡片生成与交互
- 图片 / 附件上传
- 思考过程、工具调用 UI（`reasoning` / `tool` renderer）
- Playground `AssistantFooter` / `UserFooter`（`roles.trailer` 未迁移）
- `continue-writing` 自定义 response handler 与 0.4.x 的完整联调
- 模板模式真实对话（仅占位 + stub 会话）
- Docs 站点所有 demo 的逐一验证
- `tiny-robot-patch` 目录物理删除

---

## 九、已知问题与后续阶段

| 问题 | 计划阶段 |
|------|----------|
| Template `useTemplate` 仅为 stub，无真实 LLM / 持久化 | 阶段六 |
| `GenuiTemplateChat` 占位页 | 阶段六 |
| Schema / tool / reasoning 渲染器 | 阶段二、三 |
| Playground footer 插槽 | 阶段五 |
| 删除 `tiny-robot-patch` 与 `*.legacy.vue` | 阶段七 |
| Docs / homepage demo 升级 | 阶段七 |

**建议下一步：阶段二** — 补齐 Bubble 渲染器（reasoning、tool、error-text、loading），并验证 `showThinkingResult` 样式。

---

## 十、本地验证命令（需自行启动）

```bash
# 构建 vue 包
pnpm --filter @opentiny/genui-sdk-vue build

# 启动 playground（完成后请自行 Ctrl+C 停止）
pnpm --filter genui-sdk-playground-web dev
```

> 说明：本次已按要求**停止**此前后台运行的 playground dev 服务（`localhost:5173`）。
