# tiny-robot 0.4.1 升级 — 阶段 C 工作总结

## 目标

Playground 与对外 API 直接使用 `@opentiny/tiny-robot-kit` 原生 `useConversation`，移除 `legacyConversation` 适配层。

## 完成内容

### 1. useGenuiConversation

- 删除 `LegacyUseConversationReturn`、`LegacyMessageManager`、`state` 同步 reactive
- 直接返回 `conversation`（kit 原生）、`importConversations`、`saveConversations`
- `messageManager` 保留为 `IMessageManagerBridge`（footer / continue-writing 用，非 legacy 命名语义）

### 2. GenuiChat defineExpose

| 方法 | 说明 |
|------|------|
| `getConversation()` | 返回 kit `useConversation` 实例 |
| `getMessageEngine()` | 返回 `IMessageManagerBridge` |
| `importConversations()` | 导入历史会话 |
| `saveConversations()` | 强制落盘 messages |
| `loading` | 会话加载状态 |

### 3. Playground

| 文件 | 改动 |
|------|------|
| `App.vue` | `importConversations`、`getMessageEngine` |
| `GenuiHistory.vue` | kit API：`conversations.value` / `activeConversationId` / `updateConversationTitle` |
| `PlaygroundSidebar.vue` | 传入 `importConversations`，标题读 kit |
| `use-input-message.ts` | `chatRef.loading` |
| `useTemplateConversation.ts` | 同主 Chat，去 legacy |
| `useTemplate.ts` | 直接用 kit + `templateConversationState` 薄 shim |
| `GenuiTemplateList.vue` | `conversation.value.conversations.value` |

### 4. 包导出

```ts
// chat/index.ts
export type { GenuiConversationHandle, ImportConversationItem } from ...
export type { IMessageManagerBridge } from './chat.types.js';
// 已删除 LegacyUseConversationReturn / LegacyMessageManager
```

### 5. 文档与 demos

- `history.md` / `chat.md` / demos `history.vue`：对齐 kit API

## API 对照

| 旧（legacy） | 新（kit） |
|-------------|-----------|
| `conversation.state.conversations` | `conversation.conversations.value` |
| `conversation.state.currentId` | `conversation.activeConversationId.value` |
| `conversation.state.loading` | `chatRef.loading` |
| `conversation.updateTitle(id, title)` | `conversation.updateConversationTitle(id, title)` |
| `conversation.createConversation(title)` | `conversation.createConversation({ title })` |
| `conversation.getCurrentConversation()?.messages` | `conversation.activeConversation.value?.engine.messages.value` |
| `conversation.messageManager` | `chatRef.getMessageEngine()` |

## 验收

```bash
pnpm --filter genui-sdk-playground-web exec vue-tsc --noEmit
pnpm --filter genui-sdk-playground-web dev
VITE_ENABLE_TEMPLATE=true pnpm --filter genui-sdk-playground-web dev
```

- 历史 CRUD / 导入导出
- continue-writing handlers
- Template 会话与列表
- URL `?input-message=` 填入

## 后续可选

- 阶段 A：`useGenuiSchemaChat.ts`
- 阶段 D：`chat-v2/` 目录归位去 `-v2` 后缀
