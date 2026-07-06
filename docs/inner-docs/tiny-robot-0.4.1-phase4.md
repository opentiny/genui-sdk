# tiny-robot 0.4.1 升级 — 阶段 4 工作总结

## 目标

迁移用户侧多模态输入（图片/附件上传 + templateData 气泡渲染），使 chat-v2 与 legacy 在文件上传场景下行为一致。

## 完成内容

### 1. 类型修复

- 在 `chat/chat.types.ts` 新增本地 `UserItem` / `UserTextItem` / `UserTemplateItem`，替代 `@opentiny/tiny-robot` 未导出的 `UserItem`（修复 TS2614）
- `useFileUpload.ts`、`TemplateDataRenderer.vue` 改为从 `chat.types` 引入

### 2. 多模态发送

- `useGenuiConversation.ts` 新增 `sendUserChatMessage(message: ChatMessage)`，内部调用 `engine.send(message)` 支持 multimodal `content`
- `GenuiChat.vue` 的 `handleSendMessage`：
  - 纯文本：仍走 `sendUserMessage`
  - 有附件：经 `processAttachments` 构建 `apiContent`，并设置 `messages: [{ type: 'templateData', ... }]`
  - 附件处理失败时不发送（比 legacy 更合理）

### 3. TrSender 文件上传

- `:allow-files="isAllowFiles"`（依赖 `props.features.supportImage`）
- `:button-group="buttonGroup"`（MIME accept 来自 `MIME_TYPE_MAP`）
- `v-model:template-data` + `@files-selected` + `@update:template-data`
- `#header` 插槽挂载 `AttachmentsRenderer`

### 4. templateData 渲染器

- 新增 `chat-v2/renderers/TemplateDataItemRenderer.vue`，复用 legacy `TemplateDataRenderer.vue`
- 在 `contentRendererMatches.ts` 注册 `type === 'templateData'`

### 5. TrSender 组件选型（重要）

0.4.1 中 `TrSender` 已重构为基于 Tiptap 的新组件，**不再识别** `allowFiles` / `buttonGroup` / `templateData` 等旧 props。

文件上传与 template 能力需使用 **`TrSenderCompat`**（兼容层）：
- 内部包装新 `Sender` + `Template` extension
- 支持 `allowFiles`、`buttonGroup`、`files-selected`
- `templateData` 需通过 ref 调用 `setTemplateData()` 同步到编辑器（compat 层未完整实现 v-model 双向绑定）


- 修复 `BubbleRendererMatchPriority.CUSTOM` → `CONTENT`（0.4.1 无 CUSTOM 枚举值）

## 关键文件

```
packages/frameworks/vue/src/chat-v2/
├── GenuiChat.vue                         # 文件上传 + 多模态发送
├── useGenuiConversation.ts               # sendUserChatMessage
├── contentRendererMatches.ts             # templateData 注册
└── renderers/TemplateDataItemRenderer.vue

packages/frameworks/vue/src/chat/
├── chat.types.ts                         # UserItem 本地类型
└── useFileUpload.ts                      # 复用，无 chat-v2 副本
```

## 验收

```bash
pnpm --filter @opentiny/genui-sdk-vue build
pnpm --filter genui-sdk-playground-web dev
```

Playground 需通过 `:features="modelFeatures"` 启用 `supportImage`，方可测试图片上传。

## 下一阶段（阶段 5）

- Playground footer 插槽
- 抽取 `useGenuiSchemaChat.ts`（`showMessages`、Schema 编排）
- 评估去掉 `saveConversations()` 显式调用
- Template Chat、删除 patch/legacy
