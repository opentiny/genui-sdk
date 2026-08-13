# Skill Generator 示例

## 生成本仓库 genui-schema-json skill

在 monorepo 根目录：

```bash
pnpm generate:skill   # 写入 skills/genui-schema-json
```

或在本包内（需先 build）：

```bash
pnpm generate:skill
```

配置见 [`genui-schema-json.config.json`](./genui-schema-json.config.json)：

- `materialsMetaModule` → Vue 物料 `meta.js`
- `skillDirs` → 仓库根 `skills/genui-schema-json`
- `skillBodyFormatter` → Agent 友好正文（输出格式 + 意图路由）
- `prune: true` → 仅清理 `reference/generated/` 中过期生成文件；手写文档（`quick-ref`、`components/`、`examples/` 等）不受影响
- 意图路由按目标目录「存在才出链」；手写 `rules` / `examples` / `this-context` 缺失时回退 `generated/`

`examples/skills/genui-schema-json/` 为无 formatter 的纯 genPrompt 落盘快照（文件名与 `SECTION_FILE_ALIASES` 一致），便于本地对照验证。

复制配置文件并按项目修改 `materialsMetaModule`、`skillDirs`。
