# @opentiny/genui-sdk-skill-generator

基于 `genPrompt(framework, materialsMeta, …, { isSkill: true })`，生成可在 Cursor / Claude Code 等 Agent 中按需加载的 skill。

## 分层模型

```
skills/<name>/
├── SKILL.md                      # 入口：genPrompt 前缀 + 输出格式 / 工作流 / 类型索引（仅链接已存在文件）
└── reference/
    ├── quick-ref.md              # 手写：高频约定速查（存在才出链）
    ├── rules.md                  # 手写：生成约束补充；缺失则回退 generated/rules.md
    ├── editing.md                # 手写：修改已有卡片时的补读
    ├── common-mistakes.md        # 手写：常见错误
    ├── this-context.md           # 手写：this / 事件补充；缺失则回退 generated
    ├── examples.md               # 手写：卡片示例补充；缺失则回退 generated
    ├── examples/
    │   └── login-form.md         # 手写：登录表单等整卡示例
    ├── components.md             # 生成器写入：按类型分组的 componentName 白名单索引
    ├── components/               # 可选分类手写（存在则挂到对应类型标题下）
    │   ├── basic.md              # 手写：基础元素补充
    │   ├── forms.md              # 手写：表单组件补充
    │   └── …
    └── generated/                # 生成层（可覆盖，与 genPrompt 同步）
        ├── components.md         # 全量组件 dump，仅用于还原 genPrompt，不要作为读取入口
        ├── components/           # 按类型拆分的 props / events（Agent 按需读这里）
        │   ├── basic.md          # 基础元素（a、Text、TinyIcon 等）
        │   ├── layout.md         # 布局组件（TinyCard 等）
        │   ├── forms.md          # 表单组件（TinyForm、TinyInput 等）
        │   ├── data-display.md   # 数据展示（TinyGrid、TinyPager）
        │   ├── charts.md         # 图表组件（TinyHuicharts*）
        │   └── …                 # 未归类时还有 other.md
        ├── json-schema.md        # 卡片节点 JSON Schema：字段、白名单 enum、JSExpression / JSFunction / JSSlot
        ├── examples.md           # 完整卡片示例（表单双向绑定、信息展示等）
        ├── schema-snippets.md    # 可复用节点片段（单组件 props 样例）
        ├── rules.md              # schemaJson 生成规则（Page 根、state/methods、禁止 Mock 等）
        ├── this-context.md       # this.state / this.methods / this.callAction 用法
        └── actions.md            # 自定义 Action 定义（提供 customActions 时生成）
```

- **手写层**：补充说明，体积小、语义清晰；需自行维护，生成器不 scaffold
- **生成层**：完整物料 dump 与按类型拆分的组件详情；生成器只写这里
- **类型索引**：`components.md` 由生成器按表单 / 图表 / 数据展示等分组，并链到 `generated/components/<类型>.md`
- **出链策略**：工作流 / 手写补充链均「存在才出链」；`json-schema` / `rules` / `examples` / `this-context` 手写缺失时回退 `generated/` 同名文件；组件 props 优先链拆分文件，不链全量 `generated/components.md`

## genPrompt 一致性

- `SKILL.md` 始终逐字保留 `genPrompt` 的一级标题前缀；formatter 只在其后追加工作流与类型索引
- `reference/generated/*.md` 是原始 `##` 章节的无损分片，不格式化、不补换行
- 除 `isSkill=true` 外不覆盖 `genPrompt` 的默认章节开关；JSON Schema 默认保留，Action 在提供 `customActions` 时生成
- 生成结束后会从磁盘重新读取入口前缀和所有分片；无法逐字还原原始 `genPrompt` 时直接报错
- `referenceSubdir` 为空时禁止启用 `prune`，避免清理手写 reference 文件

## 安装

```bash
pnpm add @opentiny/genui-sdk-skill-generator
```

默认包含 OpenTiny Vue 物料。需要接入自定义物料时，在配置中提供自己的
`materialsMetaModule`（如 `@opentiny/genui-sdk-materials-vue-opentiny-vue/meta`）。

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
npx @opentiny/genui-sdk-skill-generator
```

不传配置时会使用包内置默认配置，并把 skill 生成到当前运行目录的
`skills/genui-schema-json`。

指定输出目录：

```bash
npx @opentiny/genui-sdk-skill-generator --out ./skills/my-skill
```

如需自定义物料、输出目录或 Action，可传入配置文件：

```bash
npx @opentiny/genui-sdk-skill-generator --config path/to/config.json
```

仓库默认配置见 [`config.json`](./config.json)，它与 Playground 标准模式保持一致，
使用完整 Vue 物料以及内置的 `continueChat`、`saveState` Action。显式传配置时，
所有相对路径都以配置文件所在目录为基准。

兼容旧的位置参数写法：

```bash
npx @opentiny/genui-sdk-skill-generator path/to/config.json
```

## CLI 配置参考

所有相对路径都以配置文件所在目录为基准。

| 配置项 | 类型 | 必填 / 默认值 | 含义 |
| --- | --- | --- | --- |
| `framework` | `string \| { rules?: string[] }` | 否，`"vue"` | 框架规则。内置 `vue`、`angular`、`react`；未知字符串回退 Vue，也可传 `{ rules }` 自定义框架规则。 |
| `materialsMetaModule` | `string` | 是 | 导出物料元数据的 ESM 模块路径，例如物料包构建后的 `dist/meta.js`。生成前必须可被 Node 动态导入。 |
| `materialsMetaExport` | `string` | 否，`"materialsMeta"` | 物料模块的具名导出名称。 |
| `skillDirs` | `string[]` | 是 | Skill 输出目录。生成章节写入每个目录；首个目录的 `SKILL.md` frontmatter 会复用于全部目录。 |
| `skillBodyFormatter` | `string` | 否 | `SKILL.md` 附加正文 formatter。当前内置 `genui-schema-json`；只追加工作流与类型索引，不替换原始 `genPrompt` 前缀。 |
| `referenceSubdir` | `string` | 否，`"generated"` | 生成章节在 `reference/` 下的子目录。推荐保持独立目录，避免覆盖手写文档。 |
| `syncComponentsIndex` | `boolean` | 否，`true` | 将按类型分组的白名单同步到 `reference/components.md`。空子目录时为保持 prompt 无损而跳过。 |
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

会刷新已提交的 [`example/genui-schema-json`](./example/genui-schema-json)，便于本地对照 CLI 输出。
