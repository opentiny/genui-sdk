# 特性点选交互说明（feat/template-select-node-chat）

> 本文档整理 `feat/template-select-node-chat` 分支上的「特性点选交互」：用户在**预览渲染器**中开启开发态（inspect 模式），悬停/点选页面上的组件，将选中组件作为**原子标签（template chip）**注入发送框（composer），随用户消息一起发送给模型，作为对 schema 进行增量修改的上下文。

## 1. 特性目标

- 让用户在可视化预览中**直接点选组件**，而不是手写 JSON/路径来引用 schema 节点。
- 点选的组件以 **Composer 原子标签**形式进入输入框，可多选、可删除（含撤销 tombstone 语义）。
- 发送时把「纯文本 + 选中组件的完整 JSON 块」拼成用户消息内容，模型可据此精准定位要修改的组件。

## 2. 整体交互链路

```
[SchemaPreviewToolbar] 检查模式开关 (isDevMode)
        │
        ▼
[GenuiTemplateDesktop] 渲染器容器绑定 useSchemaRendererInspect
        │  hover: 查找 data-id 元素 → 高亮 overlay（绿框 + 标签）
        │  click: selectedNodeFromSchemaById → insertComposerTag(node)
        ▼
[GenuiTemplateChat]（chatRef template ref）
        │  GenuiTemplateDesktop → chatRef.value?.insertComposerTag(node)
        │  生成 tag id → tagController.trackTag(id, node)
        │  向 templateData 追加 { type:'template', content: componentName, id }
        ▼
[TrSender] 渲染 template chip → [composer-atomic-tags] 锁成原子标签
        │  beforeinput 拦截删除 → tombstones 记录（支持撤销）
        ▼
[handleSendMessage] getComposerContent(templateData, selectedNodeMap)
        │  文本 + formatSelectedNodesContext(nodes) JSON 块
        ▼
user 消息 { content: apiContent, messages: [{ type:'template-user', segments }] }
        ▼
[TemplateUserMessageRenderer] 气泡内渲染 文本 + chips
```

## 3. 模块清单与职责

| 文件 | 职责 |
| --- | --- |
| `useSchemaDevMode.ts` | provide/inject 开发态上下文，仅含 `isDevMode` 状态。 |
| `SchemaPreviewToolbar.vue` | 预览工具栏：检查模式按钮（`InspectModeIcon`）、视图切换、版本回退、历史面板等。 |
| `InspectModeIcon.vue` + `assets/images/inspect-mode.svg` | 检查模式图标（raw SVG 注入，加 class 控制尺寸）。 |
| `useSchemaRendererInspect.ts` | 渲染器检查模式组合式函数：hover 高亮、click 选中、scroll/resize 同步高亮位置。 |
| `GenuiTemplateDesktop.vue` | 桌面布局装配：渲染器容器绑定 inspect 事件与高亮 overlay；通过 `useSchemaDevMode()` 取 `isDevMode`，用 `chatRef` template ref 转发 `insertComposerTag`；退出开发态时 `watch(isDevMode)` 清空 composer。 |
| `GenuiTemplateChat.vue` | 聊天装配：Composer 原子标签控制器、发送逻辑、模板用户消息、会话草稿保存/恢复；`defineExpose({ insertComposerTag, clearComposer })`。 |
| `composer-atomic-tags.ts` | **Composer 原子标签控制器**：锁 `contenteditable=false`、beforeinput 删除拦截、tombstone 撤销语义、templateData 同步。 |
| `schema-composer.ts` | Composer 内容模型：`templateData + nodeMap → segments`，`segments → 纯文本 / API 内容`。 |
| `TemplateUserMessageRenderer.vue` | 用户气泡渲染：segments（文本 + chips）或纯文本 content 渲染。 |
| `conversation-composer-drafts.ts` | 按会话 ID 保存/恢复 composer 草稿（templateData + selectedNodes）。 |
| `finalize-schema-preview.ts` + `template-chat-utils/schema-id-generator.ts` | 流式完成后为 schema 树生成/保留唯一 `id` 并写入 `index`，供渲染器元素带 `data-id`。 |
| `schema-node-selection.ts` | **点选工具层**：`SelectedSchemaNode` 类型、`selectedNodeFromSchemaById`（按 id 从 schema 树定位节点）、`formatSelectedNodesContext`（选中组件 JSON 上下文）。 |
| `chat.types.ts` | 新增 `ITemplateUserMessageItem`（`type: 'template-user'`）等消息类型。 |
| `i18n/zh.json` / `en.json` | 新增 `templateEditor.devMode`、`templateEditor.selectedComponents` 文案。 |

## 4. 详细流程

### 4.1 进入检查模式

- `SchemaPreviewToolbar.vue` 的 `toggleDevMode()` 切换 `schemaDevMode.isDevMode.value`。
- `GenuiTemplateDesktop.vue` 通过 `watch(isDevMode)` 在关闭开发态时调用 `chatRef.value?.clearComposer()`，退出时清空已选标签。

### 4.2 渲染器悬停高亮与点选（useSchemaRendererInspect）

- 渲染器容器（`.schema-renderer`，`GenuiTemplateDesktop.vue`）绑定：
  - `@mousemove="handleRendererMouseMove"`、`@mouseleave="handleRendererMouseLeave"`、`@click.capture="handleRendererInspectClick"`，并加 `is-inspectable` class。
- **前提**：schema 组件必须带 `id`。渲染器由 `@opentiny/genui-sdk-vue` 渲染，组件元素带有 `data-id`。
- `findInspectableElement(target)`：沿 DOM 向上（到 container 为止）找第一个带 `data-id` 的元素。
- `updateHighlight()`：以 container 的 `parentElement` 为 host，`getBoundingClientRect` 计算高亮框 `top/left/width/height`，`label` 为元素 `tagName` 小写；`labelInside: top < 20`（标签放框内还是框上方）。
- `onClick`：devMode 且有 schema 时，找到 `data-id` → `selectedNodeFromSchemaById(schema, id)` → `preventDefault + stopPropagation` → `insertComposerTag(node)`。
- `syncHighlight`：devMode 开启时监听 `document` scroll（capture）+ `window` resize 刷新高亮位置；关闭/卸载时移除监听。

### 4.3 ID 注入（finalizeSchemaPreview）

- 流式 `done` 后（`GenuiTemplateChat.vue` 的 `handleNotification`），调用 `finalizeSchemaPreview(preview, schema)`：
  - `generateIdForComponents(preview)` 深度遍历 schema 树：保留已有 `id`，缺失则用 `generateId()` 生成并去重；同时为 children 写 `index`。
  - 发布**新根对象**（`{ ...preview }`）到 `currentPreviewSchema` / `currentSchema`，强制渲染器重新消费带 id 的 schema。
- 这样渲染器元素上的 `data-id` 与 schema 树中的 `id` 一一对应，点选后可按 id 找回节点。

### 4.4 注入 Composer（insertComposerTag）

- `GenuiTemplateDesktop.vue` 的 `insertComposerTag(node)` 直接调用 `chatRef.value?.insertComposerTag(node)`；`GenuiTemplateChat.vue` 通过 `defineExpose` 暴露该方法。
- chat 内实现：
  1. `templateData` 为空时先以当前输入文本打底（`[{ type:'text', content: inputMessage }]`）。
  2. `const id = generateId()`，`tagController.trackTag(id, node)`（写入 `selectedNodeMap`，并删除同 id tombstone）。
  3. `templateData` 追加 `{ type: 'template', content: node.componentName, id }`。
- `TrSender` 通过 `:template-data` 渲染成 chip。

### 4.5 Composer 原子标签（composer-atomic-tags.ts）

> 背景：`TrSender`（tiny-robot 0.3.3）仍把 template chip 当可编辑文本处理。本控制器在 TrSender 原生支持不可编辑标签前，用临时方案保证标签原子性。

- **选择器**：`[data-type="template"]` 是标签，`[data-type="block"]`/`prefix`/`suffix` 是 TrSender 内部包装层，共享同一 `data-id`。
- `isComposerChipHost`：只有**最外层** host 才算 chip 宿主（block 不能再嵌套 block；template 不能位于 block 内）。
- `lockComposerTagElement`：把最外层 host 置 `contentEditable=false` 并加 `genui-composer-chip-host` class，移除内层重复的 `contenteditable="false"`（保持 prefix/suffix 可编辑），使光标一次方向键跳过整个标签。
- **删除拦截**（`bindAtomicComposerTags` 监听 `beforeinput` capture）：
  - `isDirectionalDelete` + 折叠光标 → `collectTagIdsFromInputEvent` 计算受影响标签 id，`preventDefault + stopImmediatePropagation`（TrSender 会 preventDefault 后按 target range 全删，需接管），`transaction.mark(ids)` 并回调 `onAtomicDelete`。
  - 其余输入交给 `transaction.record`：跟踪 pending 删除、用一个 microtask/`input` 事件窗口合并删除结果（`createPendingRemovalTransaction` 代际计数防止过期回调）。
- **数据同步**：`applyTemplateData(value)` → `reconcileAtomicTemplateData`（过滤掉已删/无源/内容不匹配的 template item）→ `syncComposerTagNodes`（把仍存在的 tag 刷进 `selectedNodeMap`，消失的移入 `tombstones` 供撤销）。
- `createComposerTagController` 聚合以上逻辑，暴露 `trackTag / applyTemplateData / bind / unbind / clear`。

### 4.6 发送与消息组装（schema-composer.ts）

- `getComposerContent(templateData, nodeMap)`：
  - `templateDataToSegments`：text item → `{type:'text'}`；带 id 的 template item → 查 `nodeMap` 得到 `{type:'tag', tag}`。
  - `textLength`（仅文本）、`isEmpty`（无 tag 且无有效文本）。
- 发送校验：`hasTags` 时 `composer.isEmpty || textLength > 20000` 直接 return。
- `segmentsToApiContent(segments)`：文本 join + 去重 tag（按 `id || componentName`）→ 追加 `formatSelectedNodesContext(tags)`。
- `formatSelectedNodesContext`（schema-node-selection.ts）生成：

```
[选中的组件]（i18n: templateEditor.selectedComponents / Selected components）
- componentName: TinyGrid
- id: xxxx
- path: /children/1

```json
{ ...完整组件 JSON... }
```
```

- 用户消息：`{ role:'user', content: apiContent, messageId, messages:[{ type:'template-user', segments }] }`。
- `TemplateUserMessageRenderer` 按 `segments` 渲染气泡（文本 + 蓝色 chip），无 segments 时渲染纯文本 `content`。
- 首条消息同时用纯文本截断更新会话标题。

### 4.7 会话草稿（conversation-composer-drafts.ts）

- `watch([currentConversationId, messageManager])`：切换会话前 `save(previousId, templateData, selectedNodeMap, fallbackText)`；切到新会话 `tagController.clear()` 后 `load()` 恢复 templateData 与 selectedNodes（`trackTag` 重建 nodeMap）。
- 空 templateData 时用输入文本作为回退草稿。

## 5. 关键数据流示例

```
选中 TinyGrid 组件
  → selectedNodeFromSchemaById  →  { id, componentName:'TinyGrid', path:'/children/1', node:{...} }
  → insertComposerTag            →  selectedNodeMap.set(tagId, node)
                                   templateData: [ {type:'text',content:'把角色列改成可筛选'}, {type:'template',content:'TinyGrid',id:tagId} ]
  → 发送                          →  content: "把角色列改成可筛选\n\n[选中的组件]\n- componentName: TinyGrid\n- id: ...\n- path: /children/1\n\n```json\n{...}\n```"
```

## 6. 相关提交

| Commit | 内容 |
| --- | --- |
| `727961fc` | feat(template): schema 检查模式 + 用户消息处理增强（引入检查模式与点选工具层） |
| `cfc19e23` | fix(genui-template): 按评审意见修复点选对话 |
| `c2043227` | feat(genui-template): Composer 原子标签控制器 |
| `8e140bfc` | feat(genui-template): 会话 composer 草稿 + schema 预览 finalize |
| `2e7d44c1` | feat(playground): schema 元素检查高亮 overlay |

## 7. 交互细节与注意事项

- **退出开发态清空**：关闭 inspect 模式会 `clearComposer()`，已选标签不保留。
- **重复点选**：同一组件可多次点选（每次生成新 tagId），发送时按 `id || componentName` 去重后再拼 JSON 上下文。
- **原子标签**：chips 不可部分编辑，删除需整块删除；TrSender 升级后该临时控制器可移除。
- **高亮 overlay**：`pointer-events: none`，不影响渲染器交互；`is-inspectable` 时 `[data-id]` 元素 `cursor: default`。
- **移动端**：当前 inspect 点选仅装配在桌面布局（`GenuiTemplateDesktop.vue`）；`GenuiTemplateMobile` 未接入。
