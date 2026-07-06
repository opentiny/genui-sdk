# tiny-robot 0.4.1 升级 — 阶段 6 工作总结

## 目标

Template Chat 迁移至 tiny-robot 0.4.1：原生 `useConversation` + IndexedDB，自定义 stream handler，保留 JSON Patch / Schema 预览与 Playground 集成。

## 完成内容

### 1. genui-template-v2 核心

| 文件 | 说明 |
|------|------|
| `useTemplateConversation.ts` | `useConversation` + `genui-ai-template` IndexedDB，`autoSaveMessages: true` |
| `createTemplateResponseProvider.ts` | 自定义 fetch，替代 legacy `template-provider` |
| `templateStreamHandler.ts` | `PatternExtractor` 流式解析（schema-card / json-patch / markdown） |
| `templateChatContext.ts` | provide/inject 给 schema 渲染器 |
| `contentRendererMatches.ts` | schema-card、json-patch、markdown、loading-text、error-text |

### 2. GenuiTemplateChat.vue

- `TrBubbleList` + `templateContentRendererMatches`，`#after` 挂载 `TemplateAssistantFooter`
- `schema-json-changed` / `notification` 事件 → `DeltaPatcher`、JSON Patch 预览
- 发送：user 消息带 `messageId`（cardId），`push` + `messageManager.send()`
- 完成时写 `metadata.lastSchema`（`updateConversationLastSchema`）

### 3. useTemplate.ts 重写

- 模块级单例 `useTemplateConversation`
- `templateSchemaList` 从 `metadata.lastSchema` 读取
- 导出 `importConversations`（经 legacy 桥接）
- `llmConfig` 初始化时传入 App.vue 的 `reactive` 引用，设置面板改 model/temperature 自动生效（与 legacy 一致，无需额外 watch）

### 4. Playground 集成

- `GenuiTemplateList.vue`：`importConversations` 替代直接 `unshift` state
- `chat/index.ts`：导出 `useBubbleRoleAfterSlot`

### 5. 渲染器

```
genui-template-v2/renderers/
├── SchemaCardItemRenderer.vue
├── JsonPatchItemRenderer.vue
└── LoadingTextItemRenderer.vue
```

复用 `TemplateSchemaMessageRenderer`，通过 `TEMPLATE_CHAT_CONTEXT` 注入 prevSchema / errorMessagesMap / allMessages。

## 关键约束

| 项 | 处理 |
|----|------|
| 不调用 `runDefault()` | 自定义 `templateStreamHandler` + `createTemplateResponseProvider` |
| schema-card 不做 text 兜底 | 仅匹配 `type === 'schema-card'` |
| Template 无附件 | 使用 `TrSender`（非 Compat） |
| legacy 保留 | `template-provider.ts`、`GenuiTemplateChat.legacy.vue` 阶段 7 删除 |

## 验收

```bash
pnpm --filter @opentiny/genui-sdk-vue build   # materials 未构建时可能 dts 失败，与迁移无关
pnpm --filter genui-sdk-playground-web exec vue-tsc --noEmit

# Template 模式
VITE_ENABLE_TEMPLATE=true pnpm --filter genui-sdk-playground-web dev
```

- 新建 / 切换 / 删除模板会话
- 流式生成 schema-card 与 json-patch 预览
- 刷新、复制、历史导入导出
- 切换 LLM 模型后请求使用新配置

## 下一阶段（阶段 7）

- ~~删除 `tiny-robot-patch/`、`*.legacy.vue`、`template-provider.ts`~~（已完成，见 phase7 工作总结）
- ~~更新 docs demos~~（已完成核心文档）
- 可选：抽取 `useGenuiSchemaChat.ts`、去掉显式 `saveConversations()`
