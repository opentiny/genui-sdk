---
name: genui-schema-json
description: >-
  Generates and edits interactive GenUI schemaJson cards (TinyForm, TinyCard,
  TinyGrid, charts). Use when the user asks to create, fix, or modify genui
  cards, schemaJson, login forms, tables, UI layouts, or OpenTiny components.
---
# 技能说明

你有一项技能，可用于生成可交互的 UI 界面。请结合上下文，如果需要生成界面来显示信息或收集信息，请生成对应的 schemaJson。



## 意图路由（按场景选读，不要全读）

| 用户意图 | 必读 | 选读 |
|---------|------|------|
| 新建表单 / 登录 / 注册 | [schema-json.md](reference/schema-json.md)、[json-schema.md](reference/json-schema.md)、[卡片示例.md](reference/卡片示例.md) | [可用组件.md](reference/可用组件.md)、[schema-snippets.md](reference/schema-snippets.md) |
| 展示信息 / 表格 / 图表 | [schema-json.md](reference/schema-json.md)、[json-schema.md](reference/json-schema.md)、[卡片示例.md](reference/卡片示例.md) | [可用组件.md](reference/可用组件.md)、[schema-snippets.md](reference/schema-snippets.md) |
| 修改已有卡片 | [schema-json.md](reference/schema-json.md)、[json-schema.md](reference/json-schema.md)、[this.md](reference/this.md) | 对话中的当前 schemaJson |
| 编写事件 / JSFunction | [this.md](reference/this.md) | [schema-json.md](reference/schema-json.md) |


## reference 索引

| 章节 | 文件 |
|------|------|
| 可用组件 | [可用组件.md](reference/可用组件.md) |
| 卡片的 JSON Schema | [json-schema.md](reference/json-schema.md) |
| 卡片示例 | [卡片示例.md](reference/卡片示例.md) |
| Schema Snippets | [schema-snippets.md](reference/schema-snippets.md) |
| this 上下文声明 | [this.md](reference/this.md) |
| schemaJson 生成规则 | [schema-json.md](reference/schema-json.md) |
