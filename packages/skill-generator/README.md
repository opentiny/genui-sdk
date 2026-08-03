# @opentiny/genui-sdk-skill-generator

基于 `genPrompt(framework, materialsMeta, …, { isSkill: true })`，生成可在 Cursor / Claude Code 等 Agent 中按需加载的 skill。

## 分层模型

```
skills/<name>/
├── SKILL.md                      # 入口：输出格式 + 手写优先意图路由
└── reference/
    ├── quick-ref.md              # 手写层（不覆盖）
    ├── rules.md / editing.md / …
    ├── components.md             # 白名单索引（仅同步白名单行）
    ├── components/               # 分类手写
    ├── examples/login-form.md
    └── generated/                # 生成层（可覆盖，与 genPrompt 同步）
        ├── components.md
        ├── examples.md
        ├── rules.md
        ├── schema-snippets.md
        └── this-context.md
```

- **手写层**：Agent 日常必读，体积小、语义清晰
- **生成层**：完整物料 dump，按需查阅；生成器只写这里

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

见 [`examples/genui-schema-json.config.json`](./examples/genui-schema-json.config.json)。

## 本仓库维护

```bash
pnpm generate:skill   # 写入 skills/*/reference/generated + 同步白名单
```
