# Tiny Robot 0.4.1 升级计划

> 当前版本：`@opentiny/tiny-robot` / `tiny-robot-kit` / `tiny-robot-svgs` **0.3.3**  
> 目标版本：**0.4.1**  
> 参考仓库：`/Users/lhuans/Documents/code/opentiny/tiny-robot`  
> 迁移指南：`docs/src/migration/`（`use-message-migration.md`、`use-conversation-migration.md`、`bubble-migration.md`）

## 原则

1. **不考虑旧版本 IndexedDB 数据兼容性** — 使用 tiny-robot 0.4.x 原生 `IndexedDBStrategy`（`genui-ai` 等新 db 名即可）。
2. **删除 `tiny-robot-patch`** — 改用 `@opentiny/tiny-robot-kit` 原生 `useMessage` / `useConversation`。
3. **手动 `saveConversations()` → 自动保存** — 开启 `autoSaveMessages: true`，移除业务层散落的手动保存调用。
4. **废弃 API 全部替换** — 见下文「API 对照表」。
5. **渐进式迁移** — 在 `chat-v2` / `genui-template-v2` 中按功能与样式逐步还原，旧实现保留为 `*.legacy.vue` 供对照。

---

## 一、GenuiChat.vue 现有功能特性清单

### 1. 核心聊天能力

| 编号 | 特性 | 实现位置 / 说明 |
|------|------|-----------------|
| F01 | LLM 对话（流式 SSE） | `CustomModelProvider` + `AIClient` + `chat-api` |
| F02 | 会话管理（多会话 CRUD） | `tiny-robot-patch/useConversation` |
| F03 | IndexedDB 持久化 | `tiny-robot-patch/IndexedDBStrategy`（整包 conversations 存储） |
| F04 | 手动保存会话 | `autoSave: false` + 多处 `saveConversations()` |
| F05 | 新建会话 | `createConversation()` + `handleNewConversation` expose |
| F06 | 切换会话自动滚底 | `watch(conversationState.currentId)` + `scrollToBottomWithRetry` |
| F07 | 首条消息自动更新标题 | `setConversationTitle`（截取前 20 字符） |
| F08 | 初始消息注入 | `props.messages` 覆盖当前会话 |
| F09 | 请求中止 | `abortRequest` → TrSender `@cancel` |
| F10 | 流式数据自定义处理 | `events.onReceiveData` + `preventDefault()` |
| F11 | 请求结束/error 处理 | `events.onFinish` 推送 `error-text` 消息 |

### 2. UI 组件（Tiny Robot Bubble / Sender）

| 编号 | 特性 | 实现说明 |
|------|------|----------|
| F12 | 消息气泡列表 | `TrBubbleList` + `:items` + `:roles` |
| F13 | 内容渲染器注册 | `TrBubbleProvider` + `contentRenderers` Map |
| F14 | 角色配置（user/assistant） | 默认头像 `IconAi` / `IconUser`，`customContentField: 'messages'` |
| F15 | 自定义 roles 插槽 | `wrapSlots` 注入 `isFinished` / `messageManager` / `chatMessage` |
| F16 | 空状态插槽 | `#empty` |
| F17 | 发送框 | `TrSender`：placeholder、clearable、字数限制 1000、loading |
| F18 | 滚动到底部按钮 | 生成中旋转边框动画 + `isLastMessageInBottom` 显隐 |
| F19 | 消息区自适应宽度 | `useResize` → CSS 变量 `--messages-container-width` |
| F20 | 自动滚底（节流 400ms） | `watch(messages)` + `throttle(autoScrollToBottom)` |

### 3. 消息渲染器（contentRenderers）

| 编号 | type | 组件 / 说明 |
|------|------|-------------|
| F21 | `custom-text` | 纯文本 span |
| F22 | `schema-card` | `GenuiRenderer` + customComponents / customActions |
| F23 | `tool` | `ToolRenderer` |
| F24 | `reasoning` | `ReasoningRenderer` |
| F25 | `markdown` | `BubbleMarkdownContentRenderer`（html: true） |
| F26 | `templateData` | `TemplateDataRenderer`（图片/模板混排） |
| F27 | `loading-text` | `GeneratingComponent` 或 `props.thinkComponent` |
| F28 | `error-text` | `ErrorText` |

### 4. GenUI 业务集成

| 编号 | 特性 | 说明 |
|------|------|------|
| F29 | Schema 卡片流式生成态 | `lastSchemaCardId` + `generating` 控制 `GenuiRenderer.generating` |
| F30 | 卡片状态持久化 | `saveState` → 写入 `cardMessage.state` + 手动 save |
| F31 | 继续对话 Action | `continueChatAction` via `useChatAction` |
| F32 | 保存状态 Action | `saveStateAction` |
| F33 | CUSTOM_CONTEXT 注入 | `{ chat, generating }` 供 Renderer 使用 |
| F34 | 响应处理器链 | `defaultResponseHandlers` + expose `get/setResponseHandlers` |
| F35 | 自定义 Model Provider | `CustomModelProvider` 封装 genui `chat-api` |
| F36 | rendererSlots | header / footer 插槽透传 GenuiRenderer |
| F37 | requiredCompleteFieldSelectors | 透传 GenuiRenderer |

### 5. 文件 / 图片上传

| 编号 | 特性 | 说明 |
|------|------|------|
| F38 | 图片上传开关 | `features.supportImage` |
| F39 | 文件类型限制 | `buttonGroup.file.accept` from MIME_TYPE_MAP |
| F40 | 附件预览与删除 | `AttachmentsRenderer` + `handleRemoveAttachment` |
| F41 | Template 混排输入 | `templateData` + `TrSender` v-model:template-data |
| F42 | 附件处理为 API 内容 | `processAttachments` → 多模态 content |

### 6. 加载 / 思考过程 UI

| 编号 | 特性 | 说明 |
|------|------|------|
| F43 | PROCESSING 态假消息 | `showMessages` 追加 `{ loading: true }` |
| F44 | 流式中 loading-text | 向最后 assistant 消息的 `messages` 数组追加 |
| F45 | 思考过程显隐 | `--thinking-display` CSS + `chatConfig.showThinkingResult` |

### 7. 主题 / 国际化 / 配置

| 编号 | 特性 | 说明 |
|------|------|------|
| F46 | 暗色主题 | `genuiConfig.theme === 'dark'` |
| F47 | i18n | `useI18n`：placeholder、footer、conversation 标题等 |
| F48 | Props 配置面 | url、model、temperature、chatConfig、customComponents/Snippets/Examples/Actions、customFetch |

### 8. 对外 API（defineExpose）

| 方法 | 用途 |
|------|------|
| `setInputMessage` | 外部设置输入框 |
| `handleNewConversation` | 新建会话 |
| `getConversation` | 获取 conversation 实例（playground history demo） |
| `getResponseHandlers` / `setResponseHandlers` | 实验性响应处理器 |
| `getMessageRenderers` / `setMessageRenderer` | 实验性渲染器扩展 |

### 9. 样式特性

- 容器背景、sender 背景图（light/dark SVG）
- assistant 气泡透明背景、无 padding
- user 气泡 90% 最大宽度
- schema-render-container 响应式 min-width
- scroll-to-bottom 按钮 hover / generating 动画

---

## 二、GenuiTemplateChat.vue 现有功能特性清单

| 编号 | 特性 | 与 GenuiChat 差异 |
|------|------|-------------------|
| T01 | 模板会话（独立 IndexedDB） | db: `genui-ai-template` |
| T02 | Schema 流式预览 | `schemaCardRenderer` + `DeltaPatcher` |
| T03 | JSON Patch 流式预览 | `jsonPatchRenderer` + `jsondiffpatch` |
| T04 | schema-json-changed 事件 | emitter 驱动实时预览 |
| T05 | 完成通知缓存 schema | `notification` done → 写入 cardMessage |
| T06 | Assistant trailer 插槽 | 刷新 / 复制 `AssistantFooter` |
| T07 | 消息刷新（回滚重发） | `handleRefresh` 截断 messages + send |
| T08 | cardId 追踪 | `currentCardId` 防重复 patch |
| T09 | useTheme 同步 | 跟随 GENUI_CONFIG theme |
| T10 | 渲染器 | 仅 markdown / schema-card / json-patch |
| T11 | 无文件上传 | Sender 更简洁，maxLength 5000 |
| T12 | template-provider | 独立 `CustomModelProvider`（含 schema 上下文） |

---

## 三、涉及文件范围

### packages/frameworks/vue

| 路径 | 操作 |
|------|------|
| `src/chat/GenuiChat.vue` | → `GenuiChat.legacy.vue`（保留对照） |
| `src/chat-v2/` | **新建**，渐进实现 |
| `src/chat/tiny-robot-patch/` | **删除**（迁移完成后） |
| `src/chat/CustomModelProvider.ts` | 重构为 `createGenuiResponseProvider` |
| `src/chat/response-handler.ts` | 适配 0.4.x plugin 体系 |
| `src/chat/index.ts` | 改导出入口 + 移除 patch 导出 |
| `package.json` | 依赖升至 0.4.1 |

### sites/playground/web

| 路径 | 操作 |
|------|------|
| `src/App.vue` | 适配新 expose API（conversation 结构变化） |
| `src/components/genui-template/GenuiTemplateChat.vue` | → `GenuiTemplateChat.legacy.vue` |
| `src/components/genui-template-v2/` | **新建** |
| `src/components/genui-template/useTemplate.ts` | 改用原生 useConversation |
| `src/components/genui-template/template-provider.ts` | 改为 responseProvider |
| `src/hooks/use-input-message.ts` | 适配新 chat ref API |
| `package.json` | 依赖升至 0.4.1 |

### docs / homepage（次要，可放最后）

- `docs/demos/**` 中所有 `GenuiChat` 示例
- `sites/homepage/web` 展示页

---

## 四、API 废弃对照与替换方案

### useMessage / useConversation（tiny-robot-kit）

| 0.3.x（当前） | 0.4.x（目标） | genui-sdk 改法 |
|---------------|---------------|----------------|
| `useMessage({ client })` | `useMessage({ responseProvider })` | `createGenuiResponseProvider()` 封装现有 chat-api SSE |
| `messageState.status` / `STATUS` | `requestState` + `processingState` + `isProcessing` | UI 判断改用 `isProcessing` |
| `GeneratingStatus` | 无（用 `isProcessing`） | 删除引用 |
| `inputMessage`（内置） | 业务层 `ref('')` | GenuiChat 自行维护 |
| `messageManager.send()` | `engine.sendMessage()` 或 `send()` | 统一封装 |
| `messageManager.addMessage()` | `engine.messages.value.push()` + `sendMessage` | 调整发送流程 |
| `events.onReceiveData` | 自定义 plugin `onCompletionChunk` | 将 response-handler 链改为 plugin |
| `events.onFinish` | plugin `onTurnEnd` / `onError` | 错误消息推送逻辑迁移 |
| `useConversation({ client })` | `useConversation({ useMessageOptions })` | 传入 responseProvider |
| `state` + `messageManager` | `conversations` + `activeConversation` + `.engine` | playground history 等需改 |
| `saveConversations()` 手动 | `autoSaveMessages: true` | 删除所有手动 save |
| patch `IndexedDBStrategy` | `indexedDBStorageStrategyFactory` 或原生 `IndexedDBStrategy` | 使用 0.4.x 拆分存储 API |

### AIClient / BaseModelProvider

| 0.3.x | 0.4.x | genui-sdk 改法 |
|-------|-------|----------------|
| `AIClient` + `CustomModelProvider extends BaseModelProvider` | **deprecated** | 删除，改为 `responseProvider` 直接调 `chat-api` + `sseStreamToGenerator` |
| `client.chatStream` + handler | `responseProvider` 返回 `AsyncGenerator` | 用 `sseStreamToGenerator` |

### Bubble 组件

| 0.3.x | 0.4.x | genui-sdk 改法 |
|-------|-------|----------------|
| `TrBubbleList :items` | `:messages` | 数据 prop 改名 |
| `:roles` | `:role-configs` | prop 改名 |
| `customContentField: 'messages'` | `contentResolver: (m) => m.messages ?? m.content` | 在 BubbleList 上配置 |
| `contentRenderers: Record` | `contentRendererMatches: []` | 每个 type 写一个 `find` + `renderer` |
| slot `trailer` / `footer` | `after` / `content-footer` | 参数改为 `{ messages, messageIndexes }` |
| `--tr-bubble-content-*` CSS | `--tr-bubble-box-*` CSS | 样式变量迁移 |
| 手动追加 loading 消息 | `{ loading: true }` 消息或内置 loading renderer | 优先用 0.4.x 内置 loading |

### 存储（IndexedDB）

| patch 层（0.3.x 风格） | 0.4.x 原生 |
|------------------------|------------|
| `saveConversations(all)` | `saveConversation` + `saveMessages` 分离 |
| `loadConversations()` 含 messages | `loadConversations()` 仅元数据 + `loadMessages(id)` 懒加载 |
| 单 key 存整包数组 | conversations / messages 两个 objectStore |

---

## 五、分阶段升级计划

### 阶段 0：准备工作（当前）

- [x] 新建 `packages/frameworks/vue/src/chat-v2/`，导出占位 `GenuiChat.vue`
- [x] 原 `GenuiChat.vue` 重命名为 `GenuiChat.legacy.vue`，入口改导 v2
- [x] 新建 `sites/playground/web/src/components/genui-template-v2/`
- [x] 原 `GenuiTemplateChat.vue` 重命名为 `GenuiTemplateChat.legacy.vue`
- [ ] 升级 `package.json` 依赖至 0.4.1（可在阶段 1 一起做）

### 阶段 1：基础设施（P0）✅ 已完成

**目标**：最小可运行聊天，无 GenUI 卡片。

1. ✅ 依赖升级：`@opentiny/tiny-robot`、`tiny-robot-kit`、`tiny-robot-svgs` → `0.4.1`
2. ✅ 实现 `createGenuiResponseProvider.ts` + `genuiStreamHandler.ts`（复用 response-handler 链）
3. ✅ 实现 `useGenuiConversation.ts`（原生 `useConversation` + `autoSaveMessages` + IndexedDB）
4. ✅ `chat-v2/GenuiChat.vue` 骨架（BubbleList / Sender / markdown 渲染 / 暗色主题）

**新增文件**：
- `packages/frameworks/vue/src/chat-v2/createGenuiResponseProvider.ts`
- `packages/frameworks/vue/src/chat-v2/genuiStreamHandler.ts`
- `packages/frameworks/vue/src/chat-v2/useGenuiConversation.ts`
- `packages/frameworks/vue/src/chat-v2/contentRendererMatches.ts`
- `packages/frameworks/vue/src/chat-v2/renderers/MarkdownItemRenderer.vue`

**验收**：playground dev 可启动；可发送文本、流式 markdown、会话自动持久化（新 DB：`genui-ai-v2`）

### 阶段 2：Bubble 渲染器迁移（P0）

1. `contentRendererMatches` 注册所有自定义 type（F21–F28）
2. `contentResolver` 解析 `messages` 字段
3. 内置 markdown / reasoning / tool 优先使用 0.4.x `BubbleRenderers.*`，仅 schema-card 等保留自定义
4. `showMessages` 逻辑简化：PROCESSING / loading-text 改用 0.4.x loading 机制或自定义 match

**验收**：思考过程、工具调用、markdown、错误文本正常渲染。

### 阶段 3：GenUI Schema 集成（P0）

1. `schema-card` renderer → `GenuiRenderer`
2. `continueChat` / `saveState` actions
3. `CUSTOM_CONTEXT` provide
4. `lastSchemaCardId` + generating 态
5. rendererSlots、customComponents、customActions 透传

**验收**：playground 可生成并交互 Schema 卡片。

### 阶段 4：文件上传与多模态（P1）

1. 迁移 `useFileUpload` 逻辑
2. TrSender `allow-files` / template-data
3. `templateData` renderer + `AttachmentsRenderer`

**验收**：图片上传 demo 正常。

### 阶段 5：会话与 Playground 集成（P1）

1. 适配 `defineExpose` API（保持向后兼容别名）
2. `App.vue`：roles 插槽（AssistantFooter / UserFooter）
3. `use-input-message.ts` 适配
4. `continue-writing` response handlers 注册
5. history demo：`getConversation` 返回新结构文档化

**验收**：playground 全功能与现网一致。

### 阶段 6：Template Chat 迁移（P1）

1. `genui-template-v2/GenuiTemplateChat.vue` 按 T01–T12 逐步还原
2. `useTemplate.ts` 改用原生 useConversation + 独立 storage dbName
3. `template-provider` → responseProvider（携带 schema 上下文）
4. JSON Patch / Schema 流式预览逻辑保持不变（与 tiny-robot 解耦）

**验收**：`VITE_ENABLE_TEMPLATE=true` 时模板功能完整。

### 阶段 7：清理（P2）

1. 删除 `tiny-robot-patch/` 目录
2. 删除 `*.legacy.vue`（或移至 `archive/`）
3. 删除 `CustomModelProvider.ts`（如已完全被 responseProvider 替代）
4. 更新 `chat.types.ts` 中 `UseMessageReturn` 等类型引用
5. 更新 docs demos
6. 更新 `sites/homepage/web`

---

## 六、关键代码迁移示例

### responseProvider 骨架

```ts
import { sseStreamToGenerator, useMessage } from '@opentiny/tiny-robot-kit'
import { chat } from '../chat-api'

export function createGenuiResponseProvider(getOptions: () => GenuiChatOptions) {
  return async (requestBody: MessageRequestBody, abortSignal: AbortSignal) => {
    const opts = getOptions()
    const response = await chat({
      url: opts.url,
      messages: requestBody.messages,
      model: opts.model,
      signal: abortSignal,
      // ...customComponents, customActions, etc.
    })
    return sseStreamToGenerator(response, { signal: abortSignal })
  }
}
```

### useConversation 骨架

```ts
import { useConversation, indexedDBStorageStrategyFactory } from '@opentiny/tiny-robot-kit'

const storage = indexedDBStorageStrategyFactory({ dbName: 'genui-ai' })

const conv = useConversation({
  useMessageOptions: {
    responseProvider: createGenuiResponseProvider(getOptions),
    plugins: [/* response-handler plugins */],
  },
  storage,
  autoSaveMessages: true,
  autoSaveThrottle: 1000,
})
```

### contentRendererMatches 迁移 schema-card

```ts
import { BubbleRendererMatchPriority } from '@opentiny/tiny-robot'

const contentRendererMatches = [
  {
    priority: BubbleRendererMatchPriority.CUSTOM,
    find: (_m, content, idx) => {
      const item = Array.isArray(content) ? content[idx ?? 0] : null
      return item?.type === 'schema-card'
    },
    renderer: markRaw(SchemaCardRenderer),
  },
  // ...其他 type
]
```

---

## 七、风险与注意事项

| 风险 | 缓解措施 |
|------|----------|
| response-handler 与 0.4.x 消息合并机制冲突 | 优先用 plugin hooks，避免 `preventDefault` 式拦截 |
| 插槽参数从单条 bubble 变为分组 messages | `wrapSlots` 需重写，从 `messages[0]` / `messageIndexes` 取数 |
| playground 深度依赖 `messageManager` | expose 层做兼容 adapter 或同步改 playground |
| Template JSON Patch 与 tiny-robot 无关 | 可独立迁移，仅替换会话层 |
| 0.4.x 内置 reasoning/tool renderer 行为差异 | 对比后决定复用内置或保留自定义 Renderer |

---

## 八、检查清单（上线前）

- [ ] `pnpm dev:playground` 文本对话 + Schema 生成正常
- [ ] 刷新页面后会话自动恢复（新 IndexedDB 结构）
- [ ] 暗色主题样式无回归
- [ ] 图片上传、自定义 actions/components 正常
- [ ] Template 模式（如启用）schema 流式预览正常
- [x] 无 `tiny-robot-patch` 引用
- [x] 无 `AIClient` / `BaseModelProvider` / `STATUS` / `GeneratingStatus` 引用（运行时源码）
- [ ] docs demos 通过
- [ ] TypeScript 构建无错误

---

## 九、目录结构（迁移后目标）

```
packages/frameworks/vue/src/
├── chat-v2/
│   ├── GenuiChat.vue
│   ├── useGenuiConversation.ts
│   ├── createGenuiResponseProvider.ts
│   ├── genuiMessagePlugins.ts      # 原 response-handler 链
│   ├── contentRendererMatches.ts
│   └── index.ts
├── chat/                           # 共享模块（保留）
│   ├── chat-api.ts
│   ├── chat.types.ts
│   ├── chat-utils.ts
│   ├── useFileUpload.ts
│   ├── renderer/
│   ├── i18n/
│   └── GenuiChat.legacy.vue        # 迁移完成后删除
└── chat/index.ts                   # export GenuiChat from chat-v2

sites/playground/web/src/components/
├── genui-template-v2/
│   └── GenuiTemplateChat.vue
└── genui-template/
    ├── GenuiTemplateChat.legacy.vue
    └── useTemplate.ts              # 逐步改用 v2 API
```
