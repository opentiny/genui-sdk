---
name: genui-schema-json
description: >-
  Generates and edits interactive GenUI schemaJson cards (TinyForm, TinyCard,
  TinyGrid, charts). Use when the user asks to create, fix, or modify genui
  cards, schemaJson, login forms, tables, UI layouts, or OpenTiny components.
---
# 技能说明

你有一项技能，可用于生成可交互的 UI 界面。请结合上下文，如果需要生成界面来显示信息或收集信息，请生成对应的 schemaJson。



# GenUI schemaJson 生成技能

## ⚠️ 输出格式（最高优先级，必须遵守）

你的输出**只能**是一个 schemaJson 代码块。回复的第一行必须是字面量 `` ```schemaJson ``，最后一行必须是字面量 `` ``` ``，中间是合法 JSON。

```schemaJson
{ "componentName": "Page", "state": {}, "methods": {}, "children": [{ "componentName": "TinyCard", "children": [] }] }
```

**禁止：** `json` 代码块、裸 JSON、代码块外的任何文字、多个代码块。

**技能模式约束：** 除上下文数据和工具调用结果外，禁止使用 Mock 数据。

## 工作流（按步读取，不要一次读完全部 reference）

每次生成或修改 schemaJson 时按顺序执行：

1. 读结构契约：[json-schema.md](reference/generated/json-schema.md) — 节点字段、componentName 白名单 enum、JSExpression / JSFunction / JSSlot
2. 读生成约束：[rules.md](reference/generated/rules.md)
3. 按类型选组件：打开 [components.md](reference/components.md) 对应章节，不要读全部类型
4. 需要 props / events 时，只读下方「组件类型索引」中对应类型文件，禁止读取 `generated/components.md` 全文
5. 写 methods / 事件时读 [this-context.md](reference/generated/this-context.md)；调用 Action 时再读 [generated/actions.md](reference/generated/actions.md)
6. 需要整卡参考时读 [examples.md](reference/generated/examples.md) 或 [schema-snippets.md](reference/generated/schema-snippets.md)
7. 只输出一个 schemaJson 代码块（见上方格式）

组件 props 只读 `reference/generated/components/` 下对应类型文件；示例再读 `reference/generated/` 中的 examples / snippets。链接仅包含当前 skill 目录中已存在的文件。

## 按任务补读

**新建卡片**（表单、表格、图表、信息展示）
- 必走工作流第 1–4 步：[json-schema.md](reference/generated/json-schema.md)、[rules.md](reference/generated/rules.md)、类型索引
- 属性细节只读组件类型索引中的对应类型文件
- [examples.md](reference/generated/examples.md)

**修改已有卡片**
- 以对话中的当前 schemaJson 为准
- 用 [json-schema.md](reference/generated/json-schema.md)、[rules.md](reference/generated/rules.md) 校验结构与约束
- 改事件 / methods：[this-context.md](reference/generated/this-context.md)

**表单 / 登录 / 注册**
- 看类型索引「表单组件」
- 输入项必须双向绑定（见 [rules.md](reference/generated/rules.md)）
- [表单组件](reference/generated/components/forms.md)

**表格 / 分页**
- 看类型索引「数据展示」
- [数据展示](reference/generated/components/data-display.md)
- [examples.md](reference/generated/examples.md)

**图表**
- 看类型索引「图表组件」
- [图表组件](reference/generated/components/charts.md)
- [examples.md](reference/generated/examples.md)

**编写事件 / JSFunction**
- [this-context.md](reference/generated/this-context.md)；对照 [json-schema.md](reference/generated/json-schema.md) 中的 JSFunction / JSExpression 结构

**调用 Action**
- [this-context.md](reference/generated/this-context.md)、[generated/actions.md](reference/generated/actions.md)

## 组件类型索引

从 [components.md](reference/components.md) 看白名单；props / events 只读当前任务对应的类型文件（名称必须在白名单内）：

- [基础元素](reference/generated/components/basic.md)
- [布局组件](reference/generated/components/layout.md)
- [表单组件](reference/generated/components/forms.md)
- [数据展示](reference/generated/components/data-display.md)
- [图表组件](reference/generated/components/charts.md)

## Page 根节点骨架

- `state`、`methods` **始终存在**（无数据时用 `{}`）
- 字段顺序：`componentName` → `state` → `methods` → 其他 → `children`
- 根内容用 `TinyCard` 包裹；仅 `TinyCard` 禁止颜色样式，其他组件可正常使用 `style`

## 完整物料（按需再读）

| 章节 | 文件 |
|------|------|
| 基础元素 | [generated/components/basic.md](reference/generated/components/basic.md) |
| 布局组件 | [generated/components/layout.md](reference/generated/components/layout.md) |
| 表单组件 | [generated/components/forms.md](reference/generated/components/forms.md) |
| 数据展示 | [generated/components/data-display.md](reference/generated/components/data-display.md) |
| 图表组件 | [generated/components/charts.md](reference/generated/components/charts.md) |
| 卡片的 JSON Schema | [json-schema.md](reference/generated/json-schema.md) |
| 卡片示例 | [examples.md](reference/generated/examples.md) |
| Schema Snippets | [schema-snippets.md](reference/generated/schema-snippets.md) |
| this 上下文声明 | [this-context.md](reference/generated/this-context.md) |
| Action 定义 | [actions.md](reference/generated/actions.md) |
| schemaJson 生成规则 | [rules.md](reference/generated/rules.md) |