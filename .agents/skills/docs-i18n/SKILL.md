---
name: docs-i18n
description: >-
  Sync GenUI SDK docs between Chinese and English when adding, editing, renaming,
  or deleting documentation under docs/. Use when the user modifies docs/src/,
  docs/demos/, docs/demos/en/, zh-theme.ts, en-theme.ts, or asks to update
  English docs, i18n docs, or mirror Chinese documentation changes.
---

# GenUI SDK 文档国际化

完整约定见仓库根目录 `docs/I18N.md`。修改中文文档时（共享 demo、仅改图片等例外除外），**必须同步**英文镜像与导航配置。

## 目录映射

| 类型 | 中文 | 英文 |
|------|------|------|
| Markdown | `docs/src/<path>.md` | `docs/src/en/<path>.md` |
| Demo | `docs/demos/<path>.vue` | `docs/demos/en/<path>.vue` |
| 图片 | `docs/src/public/`（共用，无需复制） | 同上 |
| 中文导航 | `docs/.vitepress/config/zh-theme.ts` | — |
| 英文导航 | — | `docs/.vitepress/config/en-theme.ts` |

**路径规则**：

- 文档：`docs/src/examples/chat/foo.md` → `docs/src/en/examples/chat/foo.md`（在 `src/` 后插入 `en/`）
- Demo：`docs/demos/chat/foo.vue` → `docs/demos/en/chat/foo.vue`（在 `demos/` 后插入 `en/`，文件名相同）

## 工作流程

根据用户操作选择对应流程，完成后执行「验证清单」。

### 新增文档

1. 编写中文 `docs/src/<path>.md`
2. 有交互示例时：
   - 中文：`docs/demos/<name>.vue`
   - 含中文 UI/文案时：`docs/demos/en/<name>.vue`（翻译 UI 文案、alert、Schema label 等；代码注释可翻译或保留）
   - 纯英文、无文本、或 i18n 演示类 demo → 共用中文版，不建 `demos/en/` 镜像
3. 图片放入 `docs/src/public/`（中英文共用）
4. 在 `zh-theme.ts` 对应 sidebar 添加条目：
   ```ts
   { text: '中文标题', link: '/examples/chat/my-feature' },
   ```
5. 创建并翻译 `docs/src/en/<path>.md`
6. 在 `en-theme.ts` 对应 sidebar 添加条目（链接带 `/en` 前缀）：
   ```ts
   { text: 'English Title', link: '/en/examples/chat/my-feature' },
   ```
7. 本地预览：`cd docs && pnpm dev`

### 修改文档

| 变更类型 | 同步动作 |
|----------|----------|
| 改正文 / 标题 / 代码块 | 更新 `docs/src/en/` 下对应文件（翻译变更部分） |
| 改 demo 引用或逻辑 | 同步 `docs/demos/` 与 `docs/demos/en/` 中对应 `.vue`（如有） |
| 改 sidebar 文案或顺序 | 同步更新 `zh-theme.ts` 与 `en-theme.ts` 对应条目 |
| 仅改图片 | 无需动英文 md（public 共用） |

### 重命名 / 移动

1. 移动中文 md → 同步移动 `docs/src/en/` 下镜像文件
2. 移动 demo → 同步移动 `docs/demos/en/` 下镜像文件（如存在）
3. 更新 `zh-theme.ts` 与 `en-theme.ts` 中所有相关 `link`
4. 检查文档内相对路径引用是否仍有效

### 删除文档

1. 删除 `docs/src/<path>.md`
2. 删除 `docs/src/en/<path>.md`
3. 删除关联 demo（`docs/demos/` 与 `docs/demos/en/` 下对应文件）
4. 从 `zh-theme.ts` 与 `en-theme.ts` 移除对应 sidebar 条目

## 英文文档编写规则

### 路径调整（从中文复制时必改）

英文 md 比中文多一层 `en/`，`<demo>` 与图片的相对路径需**多加一层 `../`**，并将 demo 路径指向 `demos/en/`：

```markdown
<!-- 中文 docs/src/examples/chat/foo.md -->
<demo vue="../../../demos/chat/foo.vue" />

<!-- 英文 docs/src/en/examples/chat/foo.md -->
<demo vue="../../../../demos/en/chat/foo.vue" />
```

- 文档内互相引用：相对路径写法与中文相同
- sidebar / nav 的 `link`：英文必须带 `/en` 前缀（如 `/en/guide/quick-start`）

### 翻译原则

- 翻译自然、技术准确的英文，勿逐字机翻
- 保留 API 名称、组件名、包名、文件名、路径（如 `@opentiny/genui-sdk-vue`、`GenuiChat`）
- 代码块：仅翻译注释与字符串字面量；结构、导入、类型与中文一致
- 标题层级、章节顺序、代码块行高亮（如 `{12-19}`）与中文版对齐

### Demo 需翻译的内容

| 类型 | 示例 | 处理 |
|------|------|------|
| UI 文案 | `<button>新建会话</button>` | 译成英文 |
| 代码注释 | `// 获取会话对象` | 翻译或保留 |
| Schema 内容 | `label: '姓名'` | 译成英文 |
| alert 消息 | `alert('复制成功')` | 译成英文 |

### 无需国际化的 Demo

以下 demo 无需创建 `demos/en/` 镜像，直接共用中文版：

- 纯英文内容的 demo
- 国际化示例 demo（如 `i18n.vue`，本身演示 i18n 功能）
- 无文本内容的 demo

## 导航配置对照

两个 theme 文件结构镜像，修改时成对维护：

- `zh-theme.ts`：`nav` / `sidebar` 的 `link` 无 `/en` 前缀
- `en-theme.ts`：相同路径结构，`link` 以 `/en` 开头；`text` 为英文

sidebar 按路径前缀分组（`/guide/`、`/components/`、`/examples/`、`/schema/`、`/advanced/`），新增条目放入与中文版相同的分组与层级。

## 验证清单

完成同步后逐项确认：

```markdown
- [ ] docs/src/en/ 下存在对应的翻译文件，路径正确
- [ ] zh-theme.ts 与 en-theme.ts 均有对应 sidebar 条目且 link 正确
- [ ] zh-theme.ts 与 en-theme.ts 顶层 nav 映射一致，英文 link 带 /en 前缀
- [ ] 英文 md 中 <demo> 路径多一层 ../，且指向 demos/en/ 下对应文件（如需）
- [ ] demo 含中文内容时已在 docs/demos/en/ 提供镜像
- [ ] 删除场景下无残留英文文件、demo、sidebar 条目
- [ ] 可选：cd docs && pnpm dev 本地预览中英文页面
```

## 快速定位镜像文件

```text
中文：docs/src/examples/chat/history.md
英文：docs/src/en/examples/chat/history.md

中文 demo：docs/demos/chat/history.vue
英文 demo：docs/demos/en/chat/history.vue
```
