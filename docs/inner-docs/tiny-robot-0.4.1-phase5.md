# tiny-robot 0.4.1 升级 — 阶段 5 工作总结

## 目标

Playground 与 chat-v2 集成：气泡 footer 工具栏、response handler 链、会话 expose API 兼容。

## 完成内容

### 1. roles 插槽迁移（trailer → after）

0.4.x `TrBubbleList` 不再支持 role 上的 `slots.trailer`，改为列表级 `#after` 插槽，参数为 `{ messages, role, messageIndexes }`。

新增 `chat-v2/composables/useBubbleRoleAfterSlot.ts`：
- 读取 `props.roles[user|assistant].slots.trailer`（兼容旧名）或 `.slots.after`
- 映射为 legacy `IBubbleSlotsProps`（`index` / `isFinished` / `messageManager` / `chatMessage`）
- `assistant` 取组内最后一条消息 index；`user` 取第一条

`GenuiChat.vue` 在 `tr-bubble-list` 上挂载 `#after`，Playground 的 `AssistantFooter` / `UserFooter` 无需改动。

### 2. IRolesConfig 类型扩展

`chat.types.ts` 中 `IRolesConfig` 增加可选 `slots`（含 `trailer` / `after`），合并 `roleConfigs` 时剥离 `slots`，避免传入 `TrBubbleList` 无效 prop。

### 3. 已有 Playground 集成（阶段 1 起可用，本阶段验证）

| 能力 | 位置 | 说明 |
|------|------|------|
| `getConversation()` | `useGenuiConversation` legacy 适配层 | 供 history / continue-writing 使用 |
| `get/setResponseHandlers` | `GenuiChat` defineExpose | App.vue 注入 continue-writing handlers |
| `useInputMessage` | `hooks/use-input-message.ts` | 依赖 `conversation.state.loading`，v2 已适配 |
| `messageManager` 桥接 | `LegacyMessageManager` | 含 `messages` / `send` / `isProcessing` |

### 4. 未在本阶段做（留阶段 6/7）

- 抽取 `useGenuiSchemaChat.ts`（showMessages / Schema 编排）
- 去掉显式 `saveConversations()`（仍依赖 autoSave + 卡片 state 突变）
- Template Chat 迁移、删除 patch/legacy

## 插槽参数对照

| 0.3.x（legacy wrapSlots） | 0.4.x（#after） |
|---------------------------|-----------------|
| `index` | `messageIndexes[last]`（assistant）或 `[0]`（user） |
| `bubbleProps` | 由 `chatMessage` + `role` 合成 |
| `isFinished` | `index !== lastIndex \|\| !isProcessing` |
| `messageManager` | legacy 桥接对象 |
| `chatMessage` | `messages[index]` |

## 关键文件

```
packages/frameworks/vue/src/chat-v2/
├── GenuiChat.vue                          # #after 插槽
├── composables/useBubbleRoleAfterSlot.ts  # 插槽适配
└── index.ts                               # 导出

packages/frameworks/vue/src/chat/
└── chat.types.ts                          # IRolesConfig.slots
```

## 验收

```bash
pnpm --filter @opentiny/genui-sdk-vue build
pnpm --filter genui-sdk-playground-web dev
```

- Assistant 气泡 hover 显示刷新 / 复制 / 继续生成
- User 气泡 hover 显示编辑 / 复制
- URL `?input-message=xxx` 在会话加载后填入输入框
- continue-writing（续写、overlap 消除）行为与 legacy 一致

## 下一阶段（阶段 6）

- `genui-template-v2/GenuiTemplateChat.vue` 迁移
- `useTemplate.ts` 改用原生 useConversation
