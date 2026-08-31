# @opentiny/genui-sdk-skill-generator

基于 `genPrompt(framework, materialsMeta, …, { isSkill: true })`，生成可在 Cursor / Claude Code 等 Agent 中按需加载的 skill。

## 分层模型

```
skills/<name>/
├── SKILL.md                      # 入口：输出格式 + 意图路由（仅链接已存在文件）
└── reference/
    ├── quick-ref.md              # 手写层（不覆盖；缺失则路由不链 / 回退 generated）
    ├── rules.md / editing.md / …
    ├── components.md             # 白名单索引（同步白名单；分类链仅在文件存在时写出）
    ├── components/               # 可选分类手写（basic/forms/…；有文件才出链）
    ├── examples/login-form.md
    └── generated/                # 生成层（可覆盖，与 genPrompt 同步）
        ├── components.md
        ├── examples.md
        ├── rules.md
        ├── schema-snippets.md
        └── this-context.md
```

- **手写层**：Agent 日常必读，体积小、语义清晰；需自行维护，生成器不 scaffold
- **生成层**：完整物料 dump，按需查阅；生成器只写这里
- **出链策略**：意图路由 / 分类索引均「存在才出链」；`rules` / `examples` / `this-context` 手写缺失时回退 `generated/` 同名文件

## genPrompt 一致性

- `SKILL.md` 始终逐字保留 `genPrompt` 的一级标题前缀；formatter 只在其后追加路由说明
- `reference/generated/*.md` 是原始 `##` 章节的无损分片，不格式化、不补换行
- 除 `isSkill=true` 外不覆盖 `genPrompt` 的默认章节开关；JSON Schema 默认保留，Action 在提供 `customActions` 时生成
- 生成结束后会从磁盘重新读取入口前缀和所有分片；无法逐字还原原始 `genPrompt` 时直接报错
- `referenceSubdir` 为空时禁止启用 `prune`，避免清理手写 reference 文件

## 安装

```bash
pnpm add @opentiny/genui-sdk-skill-generator @opentiny/genui-sdk-core
```

再提供物料包的 `materialsMeta`（如 `@opentiny/genui-sdk-materials-vue-opentiny-vue/meta`）。

## 编程式 API

```typescript
import {
  buildGenuiSchemaSkillBody,
  generateSkillFiles,
} from '@opentiny/genui-sdk-skill-generator';
import { materialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';

generateSkillFiles('vue', materialsMeta, {
  skillDirs: ['/path/to/skills/genui-schema-json'],
  formatSkillBody: buildGenuiSchemaSkillBody,
  referenceSubdir: 'generated', // 默认
  syncComponentsIndex: true,    // 默认同步白名单到手写 components.md
});
```

## CLI

```bash
genui-skill-generate path/to/config.json
```

仓库实际生成配置见 [`config.json`](./config.json)，它与 Playground 标准模式保持一致，
使用完整 Vue 物料以及内置的 `continueChat`、`saveState` Action。

## CLI 配置参考

所有相对路径都以配置文件所在目录为基准。

| 配置项 | 类型 | 必填 / 默认值 | 含义 |
| --- | --- | --- | --- |
| `framework` | `string \| { rules?: string[] }` | 否，`"vue"` | 框架规则。内置 `vue`、`angular`、`react`；未知字符串回退 Vue，也可传 `{ rules }` 自定义框架规则。 |
| `materialsMetaModule` | `string` | 是 | 导出物料元数据的 ESM 模块路径，例如物料包构建后的 `dist/meta.js`。生成前必须可被 Node 动态导入。 |
| `materialsMetaExport` | `string` | 否，`"materialsMeta"` | 物料模块的具名导出名称。 |
| `skillDirs` | `string[]` | 是 | Skill 输出目录。生成章节写入每个目录；首个目录的 `SKILL.md` frontmatter 会复用于全部目录。 |
| `skillBodyFormatter` | `string` | 否 | `SKILL.md` 附加正文 formatter。当前内置 `genui-schema-json`；只追加路由，不替换原始 `genPrompt` 前缀。 |
| `referenceSubdir` | `string` | 否，`"generated"` | 生成章节在 `reference/` 下的子目录。推荐保持独立目录，避免覆盖手写文档。 |
| `syncComponentsIndex` | `boolean` | 否，`true` | 将组件白名单同步到手写 `reference/components.md`。空子目录时为保持 prompt 无损而跳过。 |
| `prune` | `boolean` | 否，`true` | 删除生成子目录内本次未生成的旧文件。`referenceSubdir` 为空时必须设为 `false`。 |
| `tgCustomConfig` | `object` | 否，`{}` | 透传给 core `genPrompt` 的自定义组件、Snippet、示例和 Action。 |
| `promptOptions` | `object` | 否 | 控制 core prompt 章节。生成器仅默认设置 `isSkill=true`，其余沿用 core 默认值。 |

推荐配置：

```json
{
  "referenceSubdir": "generated",
  "syncComponentsIndex": true,
  "prune": true
}
```

### tgCustomConfig

| 配置项 | 内容结构 | 生成效果 |
| --- | --- | --- |
| `customComponents` | `{ component, name?, description?, schema }[]` | 组件名加入白名单，属性、事件和插槽说明写入 `components.md`。`schema.properties` 可配置 `property`、`description`、`type`、`required`、`defaultValue`、嵌套 `properties`；`schema.events` 可配置 `event`、`description`、`functionInfo`。 |
| `customSnippets` | `NodeSchema[]` | 合并到 `schema-snippets.md`。节点通常包含 `componentName`、`props`、`children`，也支持 `slot`、`loop`、`loopArgs`、`condition`。 |
| `customExamples` | `{ id?, name, description?, schema }[]` | 完整卡片示例合并到 `examples.md`；`schema` 建议使用 `Page` 根节点并包含 `state`、`methods`、`children`。 |
| `customActions` | `{ name, description?, parameters?, return?, async? }[]` | 有定义且未关闭 `includeActions` 时生成 `actions.md`。`parameters` 和 `return` 使用 JSON Schema；`async=true` 表示 `this.callAction` 返回 Promise。 |

`continueChat` 和 `saveState` 是 core 识别的特殊 Action 名称，会额外生成继续对话和状态持久化规则。配置只向模型描述组件和 Action；运行时组件注册及 Action 执行函数仍需由应用提供。

### promptOptions

| 配置项 | 默认值 | 含义 |
| --- | --- | --- |
| `isSkill` | `true` | 使用 Skill 前缀和禁止无依据 Mock 数据规则；一般不要设为 `false`。 |
| `includeJsonSchema` | `true` | 生成完整 `json-schema.md`。 |
| `includeSnippets` | `true` | 生成包含物料及自定义片段的 `schema-snippets.md`。 |
| `includeExamples` | `true` | 生成包含物料及自定义示例的 `examples.md`。 |
| `includeActions` | `true` | 允许生成 Action 章节；没有 `customActions` 时仍不会产生 `actions.md`。 |
| `includeAboutThis` | `true` | 生成 `this-context.md`。 |
| `includeBaseRules` | `true` | 包含 core 基础规则；关闭后仍保留模式规则、物料规则、框架规则和自定义 `rules`。 |
| `rules` | `[]` | 追加项目规则。合并顺序是物料规则、框架规则、项目规则。 |

完整可运行配置见 [`config.json`](./config.json)。需要接入自定义组件、Snippet、示例或 Action 时，
按上面的字段说明补充到 `tgCustomConfig` 即可。

## 本仓库维护

```bash
pnpm --filter @opentiny/genui-sdk-skill-generator generate:skill
```
