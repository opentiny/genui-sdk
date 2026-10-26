# Playground TinyRobot 1.0 聊天 UI 回归修复说明

TinyRobot 从 0.3.x 升级到 **1.0.0-rc.1** 后，Playground 聊天区出现若干视觉与交互回归。本文记录问题现象、根因与修复方式，便于后续升级或接入方对照。

## 1. 用户消息编辑 / 复制应仅在 hover 时显示

| 项 | 说明 |
| --- | --- |
| **现象** | 用户气泡下方的编辑、复制按钮常显，占用空间且与升级前不一致。 |
| **根因** | `UserFooter.vue` 在迁移时将 `.user-actions` 的 `opacity` 设为 `1`；且 1.0 气泡 DOM 调整为 `tr-bubble__content` + `tr-bubble__after`，旧选择器 `.tr-bubble__content:hover + .user-footer-wrapper` 不再生效。 |
| **修复** | 恢复 `opacity: 0`，使用 `.tr-bubble[data-role='user']:hover` 与 `.user-actions:hover` 显示；编辑态继续用 `.tr-bubble:has(.user-footer-wrapper.is-editing) .tr-bubble__content { display: none }` 隐藏原气泡内容。 |
| **涉及文件** | `sites/playground/web/src/components/UserFooter.vue` |

## 2. AI 回复气泡样式（保留卡片白底、去掉外层多余框）

| 项 | 说明 |
| --- | --- |
| **现象** | 助手 schema 卡片应保留 **`.tr-bubble__box` 白底圆角**（与升级前一致）；误把 box 设为透明会导致卡片发灰、无底板。 |
| **根因** | 1.0 卡片视觉由 `.tr-bubble__box` 承担；旧版仅对 **`.tr-bubble__content` 外层容器** 做透明化（见 dev 分支 `placement-start .tr-bubble__content`），与 box 白底不冲突。 |
| **修复** | 恢复与旧版等价的选择器：`:deep(.tr-bubble[data-placement='start'] .tr-bubble__content) { padding/background/border/shadow 清零 }`；1.0 多片段共用一个 `.tr-bubble__box` 时，白底改由 `.schema-render-surface` 承担（见 §2.2），勿给整个 `schema-render-container` 铺底。 |
| **涉及文件** | `packages/frameworks/vue/src/chat/GenuiChat.vue` |

## 2.1 AI 回复正文 / tiny-card 不显示（气泡内为空）

| 项 | 说明 |
| --- | --- |
| **现象** | 助手气泡有白框和 footer，但 `tr-bubble__box` 内无正文；DevTools 中多为空注释节点。 |
| **根因** | GenUI 流式结果在 `message.messages[]` 里用 `{ type: 'markdown' \| 'schema-card', content }`；1.0 自带 `BubbleRenderers.Markdown` 却只读 `message.content`（且 `type: 'text'` 才计入 `contentText`），与 GenUI 协议不一致。 |
| **修复** | `getResolvedContent` 统一走 `resolveBubbleContents`；新增 `MarkdownContentRenderer` 将 GenUI 条目转成 `message.content` 再交给 Markdown；`custom-text` 同时匹配 `type: 'text'`，并用 `content` / `text` 字段取文案。 |
| **涉及文件** | `packages/frameworks/vue/src/chat/bubble-protocol.ts`、`GenuiChat.vue` |

## 2.2 工具调用条之间无间距

| 项 | 说明 |
| --- | --- |
| **现象** | 连续多条 `maps_geo` / `maps_distance` 等工具条紧贴在一起。 |
| **根因** | 0.3 内容在 `.tr-bubble__content-items` 下，`step-tool + step-tool` 可相邻；1.0 同轮 GenUI 片段都在 **单个** `.tr-bubble__box` 里，仅给 `.tr-bubble__content` 设 `gap` 只作用于 box 与 after，**box 内部**工具条仍贴在一起。 |
| **修复** | 助手 `.tr-bubble__content > .tr-bubble__box` 使用 `flex + gap:16px` 且 **box 外层透明**；`GenuiRenderer` 用 `.schema-render-surface` 包裹 SchemaRenderer；聊天白底/圆角/阴影只加在 **`.schema-render-surface .tiny-card`**，勿对 surface/container 使用 `--tr-bubble-box-padding`（否则整圈白边）。 |
| **涉及文件** | `packages/frameworks/vue/src/chat/GenuiChat.vue` |

## 2.3 用户头像被挤到左侧

| 项 | 说明 |
| --- | --- |
| **现象** | 用户消息右侧头像相对升级前偏左。 |
| **根因** | 误将 `max-width` 加在 `.tr-bubble__body` 上，1.0 布局为 grid（`end` 时头像在第二列），限制 body 宽度会连带压缩头像列。 |
| **修复** | 与旧版 `.tr-bubble__content-wrapper` 一致，仅对 **`.tr-bubble__content`** 设 `max-width: calc(100% - 56px * 2)`。 |
| **涉及文件** | `packages/frameworks/vue/src/chat/GenuiChat.vue` |

## 3. 输入框占满全宽

| 项 | 说明 |
| --- | --- |
| **现象** | 底部 Sender 横向铺满主区域，升级前约为 **80% 居中**。 |
| **根因** | 样式仍 targeting 旧类名 `.tiny-sender`，1.0 组件根类名为 `.tr-sender`。 |
| **修复** | 将宽度规则改为 `:deep(.tr-sender) { width: 80%; margin: 0 auto; max-width: 100%; }`。 |
| **涉及文件** | `packages/frameworks/vue/src/chat/GenuiChat.vue` |

## 4. 回车发送后输入框未清空

| 项 | 说明 |
| --- | --- |
| **现象** | 发送后输入区仍保留已发送文本（如截图中的 `111`）。 |
| **根因** | 1.0 `TrSender` 为 TipTap + `Sender.Template`：只改 `v-model` 无法清空文档；且若在 `await engine.send()` **之后**才清空，发送较慢时输入框会长时间保留原文。 |
| **修复** | 发送后在 `engine.send()` 同步入队后执行 `clearInputAfterSend()`：只重置 `templateData` / 附件 / `v-model`（由 `Sender.Template` watch 触发 `setTemplateData` → `clearContent`）。**勿**在 `@clear` 回调里再调 `TrSender.clear()`，否则会与发送后清空互相触发 `clear` 事件，带图片时易引发 ProseMirror `Maximum call stack size exceeded`。 |
| **涉及文件** | `packages/frameworks/vue/src/chat/GenuiChat.vue` |

## 5. 切换支持图片的模型后无上传入口

| 项 | 说明 |
| --- | --- |
| **现象** | 选择如 `Qwen2.5-VL-72B` 等 `supportImage: true` 的模型时，输入框底部未出现图片选择按钮。 |
| **根因** | （1）Playground `modelFeatures` 需 `watch(..., { immediate: true })` 首屏拉取能力；（2）**更关键**：1.0 `TrSender` 默认 `mode="single"`，**`#footer` 插槽只在 `mode="multiple"` 时渲染**，`UploadButton` 放在 `#footer` 在单行模式下永远不会显示。 |
| **修复** | Playground 侧 immediate watch；`GenuiChat` 为 `TrSender` 设置 `mode="multiple"`（与旧版多行输入区 + 底栏按钮布局一致），并在 `#footer` 渲染 `UploadButton`；`isAllowFiles` 逻辑与 0.3 的 `allow-files` 对齐。 |
| **涉及文件** | `sites/playground/web/src/App.vue`、`packages/frameworks/vue/src/chat/GenuiChat.vue` |

## 6. 取消「调用结果展示在界面中」后仍看到工具块

| 项 | 说明 |
| --- | --- |
| **现象** | `chatConfig.showThinkingResult === false` 时，气泡里仍出现工具调用 / 推理等中间步骤。 |
| **根因** | 0.3 靠 `--thinking-display` + `.tr-bubble__content-items:has([type^='schema-card'])` 隐藏中间项；1.0 工具渲染为 `.tr-bubble__step-tool`，且部分 DOM 不再匹配旧选择器，CSS  alone 失效。 |
| **修复** | `filterBubbleMessagesForThinkingDisplay` 在渲染前去掉 `tool` / `reasoning`（有 schema-card 时再隐藏中间 markdown）；CSS 补 `.tr-bubble__step-tool` / `.tr-bubble__reasoning` 与 0.3 的 `content-items` 规则。 |
| **涉及文件** | `packages/frameworks/vue/src/chat/bubble-protocol.ts`、`GenuiChat.vue` |

## 验证建议

1. Playground **Chat** 模式：用户消息 hover 出现编辑/复制；移开隐藏。
2. 助手返回 schema 卡片：白底圆角卡片正常；无双层外框；错误态样式正常。
3. 用户消息：头像仍在气泡最右侧，与升级前一致。
4. 输入框宽度约 80% 居中，窄屏不溢出。
5. Enter 发送后输入区与字数统计归零。
6. 切换到 VL 模型：Sender 底栏左侧出现上传按钮，可选图片并随消息发送。
7. **工具** Tab 取消「展示在界面中」后触发 MCP：气泡中不出现工具块，仅保留最终 schema / 文本答案（与 0.3 一致）。
