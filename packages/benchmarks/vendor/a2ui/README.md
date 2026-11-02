# A2UI vendor schemas

来自 [a2ui-project/a2ui](https://github.com/a2ui-project/a2ui) 的官方 Schema 快照，供 GenUI SDK benchmark 在 `BENCH_PROTOCOL=a2ui` 时使用。

## 当前 pin

| 项 | 值 |
| --- | --- |
| Spec 路径 | `specification/v0_9_1/` |
| Catalog | Basic（`catalogs/basic/`） |
| 文件 | `json/server_to_client.json`、`json/common_types.json`、`catalogs/basic/catalog.json`、`catalogs/basic/rules.txt` |

引入时的源 URL（当时 `main` 分支）：

- https://raw.githubusercontent.com/a2ui-project/a2ui/main/specification/v0_9_1/json/server_to_client.json
- https://raw.githubusercontent.com/a2ui-project/a2ui/main/specification/v0_9_1/json/common_types.json
- https://raw.githubusercontent.com/a2ui-project/a2ui/main/specification/v0_9_1/catalogs/basic/catalog.json
- https://raw.githubusercontent.com/a2ui-project/a2ui/main/specification/v0_9_1/catalogs/basic/rules.txt

## 升级

1. 替换 `v0_9_1/` 下上述四个文件（或新增 `v1_0/`，并把 `src/protocol/a2ui/paths.ts` 指到新目录）。
2. 跑一次冒烟：`BENCH_PROTOCOL=a2ui BENCH_SCENARIOS=simple-form BENCH_REPEAT=1 pnpm benchmarks:cli`。
3. 若 `$id` / `$ref` 结构有变，同步改 `src/protocol/a2ui/validate.ts` 里的 AJV 注册。

运行时不依赖 Python `a2ui-agent-sdk`；system prompt 直接拼装这些 JSON 文件。
