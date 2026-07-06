# Tiny Robot 0.4.1 升级 — 阶段 3 工作总结

> 文档日期：2026-06-23  
> 关联计划：[tiny-robot-0.4.1-upgrade-plan.md](./tiny-robot-0.4.1-upgrade-plan.md)  
> 前置文档：[tiny-robot-0.4.1-phase2-工作总结.md](./tiny-robot-0.4.1-phase2-工作总结.md)  
> 当前 tiny-robot 版本：**0.4.1**

---

## 一、阶段目标与完成情况

阶段三目标（计划 **P0**）：**GenUI Schema 集成** — Schema 卡片可流式生成、可交互，并支持 continueChat / saveState。

| 计划项 | 状态 |
|--------|------|
| `schema-card` renderer → `GenuiRenderer` | ✅ |
| `continueChat` / `saveState` actions | ✅ |
| `CUSTOM_CONTEXT` provide | ✅ |
| `lastSchemaCardId` + generating 态 | ✅ |
| `rendererSlots`、customComponents、customActions 透传 | ✅ |

**验收**：playground 可生成并交互 Schema 卡片。

---

## 二、新增 / 修改文件

### 新增

```
packages/frameworks/vue/src/chat-v2/
├── schemaCardContext.ts                    # GENUI_SCHEMA_CARD_CONTEXT 注入 key + 类型
└── renderers/
    └── SchemaCardItemRenderer.vue          # 0.4.x 适配层 → GenuiRenderer
```

### 修改

```
packages/frameworks/vue/src/chat-v2/contentRendererMatches.ts   # 注册 schema-card（CUSTOM 优先级）
packages/frameworks/vue/src/chat-v2/GenuiChat.vue               # Schema 编排逻辑（见 §四、§五）
```

### 复用（未改）

```
packages/frameworks/vue/src/renderer/SchemaCardRenderer.vue     # 即 GenuiRenderer，DeltaPatcher + Schema 渲染
packages/frameworks/vue/src/chat/continue-chat-action.ts          # continueChat / saveState action 定义
packages/frameworks/vue/src/chat/useChat.ts                     # cardIdSymbol
```

---

## 三、架构与数据流

### 3.1 Schema 渲染链路

```
SSE JSON chunk
  → response-handler.onSchemaJSON
  → assistant.messages[] += { type: 'schema-card', content, id }
  → genuiContentResolver → split 模式
  → SchemaCardItemRenderer（inject GENUI_SCHEMA_CARD_CONTEXT）
  → GenuiRenderer（SchemaCardRenderer.vue）
  → @opentiny/tiny-schema-renderer
```

### 3.2 SchemaCardItemRenderer 职责

- 通过 `useMessageContent` 读取当前 content 项（`content` / `id` / `state`）
- 通过 `inject(GENUI_SCHEMA_CARD_CONTEXT)` 获取：
  - `isGeneratingCard(cardId)` — 是否处于流式生成态
  - `customComponentsMap` / `customActionsMap`
  - `requiredCompleteFieldSelectors` / `rendererSlots`
- 将 `rendererSlots.header/footer` 经 `toSlotFunction` 转为 Vue 插槽

### 3.3 continueChat / saveState 链路

```
卡片内 Action 触发
  → GenuiRenderer.callAction('continueChat' | 'saveState', ...)
  → customActions.execute(params, rendererContext)
  → useChatAction 定义的 continueChatAction / saveStateAction
  → GenuiChat.chat / saveState
  → 更新 cardMessage.state / 追加 user 消息 / engine.send()
```

API 请求侧：`createGenuiResponseProvider` → `chat-api` 的 `customActions` 含 `continueChat` / `saveState`（经 `bundledCustomActions` 注入）。

---

## 四、设计问题解答（FAQ）

### Q1：为什么很多逻辑写在 `GenuiChat.vue` 里，看起来只为 schema-card 服务？合理吗？

**结论：作为阶段三的过渡实现可以工作，作为长期结构不合理。**

**原因（为何现在这样）：**

1. **1:1 迁移 legacy** — `GenuiChat.legacy.vue` 里 `flatAllMessages`、`getCardMessage`、`saveState`、`chat`、`lastSchemaCardId`、`messageRenderers['schema-card']` 本就集中在容器组件；阶段三优先「功能对齐」，未做模块拆分。
2. **0.4.x 渲染器 API 变化** — legacy 在 `messageRenderers` 闭包里直接访问 `props`、`generating`、`lastSchemaCardId`；v2 改为 `contentRendererMatches` + `inject`，需要有一个 **provide 方**，自然落在 `GenuiChat.vue`。
3. **并非全部只为 schema-card** — 下列逻辑表面在 Schema 区块，实际影响面更广：

| 逻辑 | 主要服务对象 |
|------|--------------|
| `chat` / `saveState` / `useChatAction` | Schema 卡片 Action + API customActions |
| `provide(CUSTOM_CONTEXT)` | 所有嵌入 Schema 的组件（`{ chat, generating }`） |
| `bundledCustomActions` | 每次 LLM 请求的 prompt 工具定义 |
| `customComponentsMap` | Schema 渲染物料 |
| `lastSchemaCardId` / `isGeneratingCard` | 仅 Schema 流式 generating 态 |

**更合理的演进方向（建议阶段五重构）：**

```
chat-v2/
├── useGenuiSchemaChat.ts       # flatAllMessages, getCardMessage, saveState, chat, lastSchemaCardId
├── schemaCardContext.ts        # 已有
├── GenuiChat.vue               # 只负责 compose + provide + 模板
└── renderers/SchemaCardItemRenderer.vue
```

原则：**GenuiChat 做编排，Schema 领域逻辑进 composable**，与 `useGenuiConversation`（会话层）并列。

---

### Q2：为什么还有 `void legacyConversation.saveConversations()`？不是已经 autoSave 了吗？

**结论：这是 legacy 习惯遗留；语义上不是「手动保存整包会话」，而是「立即刷盘当前消息」。可优化，但当前有其动机。**

**背景对比：**

| | legacy (0.3.x patch) | chat-v2 (0.4.x) |
|--|----------------------|-----------------|
| 持久化 | `autoSave: false`，处处手动 `saveConversations()` | `autoSaveMessages: true`，deep watch 节流 1s |
| `saveConversations` 实现 | 写整包 conversations 数组 | 适配层 → `conversation.saveMessages()` |

**为何 saveState 里仍调用：**

1. **legacy 1:1 迁移** — 原 `saveState` 在写入 `cardMessage.state` 后必调 `saveConversations()`。
2. **立即持久化意图** — `saveState` 常在 **continueChat 前** 执行：先落盘卡片 state，再 `addMessage` + `send()`。若仅依赖 1s 节流，用户在极短时间内刷新页面，card state 可能尚未写入 IndexedDB。
3. **嵌套 mutation 的保险** — `cardMessage.state = ...` 是改 `messages[i].messages[j]` 上的普通对象字段；虽在 reactive 树内，deep watch 理论上会触发，但显式 `saveMessages()` 是确定性刷盘。

**能否去掉？**

- **可以讨论去掉**：若验证 `autoSaveMessages` 对 `cardMessage.state` 赋值能稳定触发且在 continueChat 时序下足够快。
- **若保留**：应改名为 `flushMessages()` 或封装为 `useGenuiConversation` 的 `persistMessagesNow()`，避免 `legacyConversation.saveConversations` 这个 0.3.x 语义的名字误导。

---

### Q3：`flatAllMessages` 是干什么的？

**作用：把「多轮 assistant 气泡」里嵌套的 `messages[]` 内容项拍平成一层，便于按 `id` 查找某张 schema-card。**

**数据结构：**

0.4.x 下一轮 assistant 回复是一个 `ChatMessage`：

```ts
{
  role: 'assistant',
  content: '...',           // 累积的纯文本（handler 侧）
  messages: [               // GenUI 结构化内容项（split 渲染源）
    { type: 'reasoning', content: '...' },
    { type: 'markdown', content: '...' },
    { type: 'schema-card', content: '{...}', id: 'uuid-xxx', state: {...} },
  ],
}
```

**schema-card 的 `id` 在 `messages[]` 的 item 上，不在顶层 `ChatMessage` 上。**

**`flatAllMessages` 实现逻辑：**

```ts
// 只取 role === 'assistant' 的 ChatMessage
// 把每条 assistant.messages[] 全部 concat 成一个 IMessageItem[]
```

**谁在用：**

- `getCardMessage(cardId)` → `saveState` 根据 `context[cardIdSymbol]` 找到要写入 `state` 的那张卡片。

**为何不能只用「最后一条 assistant」？**

- 会话里可能有多轮 assistant，历史卡片仍可能被 `saveState` 更新（例如用户回到上一轮卡片操作）。
- 拍平全量 assistant 内容项，才能 **跨轮次** 用 `id` 定位。

**演进建议：**

- 可下沉到 `useGenuiSchemaChat.ts` 或 `chat-utils.ts`，命名如 `flattenAssistantContentItems(chatMessages)` 更清晰。

---

## 五、GenuiChat.vue 中 Schema 相关代码块（对照表）

| 代码 | 职责 |
|------|------|
| `bundledCustomActions` + `getRuntimeOptions` | 把 continueChat/saveState 传给 API |
| `flatAllMessages` / `getCardMessage` | 跨轮次定位 schema-card |
| `saveState` | 写 `cardMessage.state` + 刷盘 |
| `chat` | continueChat：saveState → 追加 user 消息 → send |
| `provide(CUSTOM_CONTEXT)` | 向 Schema 组件提供 chat / generating |
| `useChatAction` | 构造 Action 定义 |
| `lastSchemaCardId` / `isGeneratingCard` | 最后一张卡片流式 generating |
| `customComponentsMap` / `customActionsMap` | 渲染器 props |
| `provide(GENUI_SCHEMA_CARD_CONTEXT)` | 向 SchemaCardItemRenderer 注入 |

---

## 六、当前可用 / 不可用（相对阶段二）

### ✅ 阶段三新增

- Schema 卡片流式生成与渲染（`GenuiRenderer` + DeltaPatcher）
- 卡片内组件交互
- `continueChat` / `saveState` Action
- 卡片 `state` 持久化（写入 `cardMessage.state` + IndexedDB）
- `generating` 态（仅最后一张 schema-card 在流式时为 true）
- `customComponents` / `customActions` / `requiredCompleteFieldSelectors` / `rendererSlots` 透传

### ❌ 仍不可用

| 功能 | 计划阶段 |
|------|----------|
| 图片上传 / `templateData` | 阶段四 |
| Playground roles footer、`showMessages` 重构、Schema 逻辑抽 composable | 阶段五 |
| Template Chat | 阶段六 |
| 删除 patch / legacy | 阶段七 |

---

## 七、已知技术债（阶段三引入或延续）

| 项 | 说明 | 建议处理阶段 |
|----|------|--------------|
| Schema 逻辑堆在 `GenuiChat.vue` | 容器过重 | 阶段五 → `useGenuiSchemaChat.ts` |
| `legacyConversation.saveConversations()` | 命名与 autoSave 并存 | 阶段五 → `persistMessagesNow()` 或验证后删除 |
| `showMessages` computed 拼装 | 见阶段二文档 | 阶段五 |
| `bundledCustomActions` ref 一次性赋值 | props.customActions 动态变更时 continueChat 已在 getter 合并 | 一般够用 |

---

## 八、验收建议

```bash
pnpm --filter @opentiny/genui-sdk-vue build
pnpm --filter genui-sdk-playground-web dev
```

1. 触发 Schema 生成 → 卡片流式出现、布局正常（`schema-render-container` min-width）
2. 卡片内按钮/表单可交互
3. `continueChat` → 追加用户消息并继续对话，且带上 state 上下文
4. 操作后刷新页面 → 卡片 state 恢复（验证 saveState 持久化）
5. 生成过程中仅**最后一张**卡片显示 generating 态

---

## 九、建议下一步

**阶段四**：文件上传与 `templateData` 渲染器  

**阶段五（与 Schema 重构可并行）**：

1. 抽出 `useGenuiSchemaChat.ts`
2. 评估移除 `saveConversations()` 显式调用
3. Playground footer 插槽迁移
