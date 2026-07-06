# tiny-robot 0.4.1 升级 — 阶段 7 工作总结

## 目标

物理删除 patch / legacy 对照代码，更新文档与构建配置，完成 tiny-robot 0.4.1 迁移收尾。

## 完成内容

### 1. 删除的文件

```
packages/frameworks/vue/src/chat/
├── tiny-robot-patch/              # 整目录（5 文件）
├── GenuiChat.legacy.vue
├── CustomModelProvider.ts
└── renderer/ReasoningRenderer.vue # v2 已有 ReasoningItemRenderer

sites/playground/web/src/components/genui-template/
├── GenuiTemplateChat.legacy.vue
└── template-provider.ts
```

### 2. 构建配置

| 文件 | 变更 |
|------|------|
| `packages/frameworks/vue/vite.config.ts` | 移除 `dts.exclude` 中的 patch/legacy 路径 |
| `sites/playground/web/tsconfig.app.json` | 移除 `exclude: ["src/**/*.legacy.vue"]` |

### 3. 文档更新

| 文件 | 变更 |
|------|------|
| `docs/src/components/chat.md` + en | `UseMessageReturn` → `IMessageManagerBridge` |
| `docs/src/examples/chat/footer-toolbar.md` + en | 同上；说明 `slots.trailer` 在 GenuiChat 内仍可用 |
| `docs/src/guide/renderer-with-tiny-robot.md` + en | `AIClient` + `CustomModelProvider` → `useConversation` + `responseProvider` |

### 4. 保留（非 patch，仍运行时需要）

| 模块 | 说明 |
|------|------|
| `chat-v2/` | 主 Chat 实现 |
| `chat/` 共享模块 | `chat-api`、`chat.types`、`useFileUpload` 等 |
| `legacyConversation` adapter | Playground `getConversation()` / history / template 兼容 API |
| `genui-template-v2/` | Template Chat 实现 |
| `template-chat-api.ts` 等 | Template 流式 API 与事件 |

## 迁移完成状态

| 检查项 | 状态 |
|--------|------|
| 无 `tiny-robot-patch` 运行时引用 | ✅ |
| 无 `*.legacy.vue` 文件 | ✅ |
| 无 `template-provider.ts` | ✅ |
| 无 `CustomModelProvider.ts`（chat 包） | ✅ |
| Playground `vue-tsc` | ✅ |
| `genui-sdk-vue build` dts | 可能因 materials 未构建失败（与迁移无关） |

## 验收

```bash
pnpm --filter genui-sdk-playground-web exec vue-tsc --noEmit
pnpm --filter genui-sdk-playground-web dev

# Template 模式
VITE_ENABLE_TEMPLATE=true pnpm --filter genui-sdk-playground-web dev
```

## 后续可选优化（非本阶段范围）

- 抽取 `useGenuiSchemaChat.ts`，精简 `GenuiChat.vue`
- Playground 直接使用 tiny-robot-kit API，去掉 `legacyConversation` 适配层
- 去掉显式 `saveConversations()`，完全依赖 `autoSaveMessages`
