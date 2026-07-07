# tiny-robot 0.4.1 升级 — 阶段 B 工作总结

## 目标

去掉业务层多余的 `saveConversations()` 调用，依赖 `autoSaveMessages: true` 自动持久化；保留 API 名称与极少数必要 flush。

## 完成内容

### 1. 删除的显式 save 调用

| 文件 | 场景 | 原因 |
|------|------|------|
| `GenuiChat.vue` | 多模态发送后 | `engine.send()` / messages 变更触发 autoSave |
| `GenuiHistory.vue` | 删除 / 重命名 / 批量删除 / 新建 | kit `deleteConversation` / `updateConversationTitle` / `createConversation` 自带持久化 |
| `useTemplate.ts` | create / delete / updateTitle | 同上 |
| `useTemplateConversation.ts` | `importConversations` 内循环 | `messages.splice` 触发 autoSave |

### 2. 保留的显式 save

| 文件 | 场景 | 原因 |
|------|------|------|
| `GenuiChat.vue` `saveState` | 写入 `cardMessage.state` | 嵌套字段突变，deep watch 不一定及时落盘 |

### 3. 修复：历史导入走 kit API

`GenuiHistory.vue` 原 `state.conversations.unshift(...)` + `saveConversations()` 绕过 kit，改为：

- `useGenuiConversation` 新增 `importConversations`（与 Template 一致）
- Playground 导入调用 `importConversations`

### 4. 文档

- `docs/src/examples/chat/history.md`：说明默认 autoSave，手动 save 仅作可选 flush

## 仍保留的 API

```ts
legacyConversation.saveConversations() // → conversation.saveMessages()
```

对外 `getConversation()` 仍暴露该方法，供 schema 卡片 state 等场景强制落盘。

## 验收

```bash
pnpm --filter genui-sdk-playground-web exec vue-tsc --noEmit
pnpm --filter genui-sdk-playground-web dev
```

- 对话 / 多模态发送 → 刷新后会话仍在
- 历史：新建 / 切换 / 删除 / 重命名 / 导入导出
- Schema 卡片 saveState → 刷新后 state 仍在
- Template 模式：新建 / 删除 / 重命名模板

## 下一阶段

- 阶段 C：Playground 用 kit 原生 API，去掉 `legacyConversation` 适配层
