# A2UI vendor schemas

Vendored from [a2ui-project/a2ui](https://github.com/a2ui-project/a2ui) for GenUI SDK benchmarks (`BENCH_PROTOCOL=a2ui`).

## Current pin

| Item | Value |
|------|--------|
| Spec path | `specification/v0_9_1/` |
| Catalog | Basic (`catalogs/basic/`) |
| Files | `json/server_to_client.json`, `json/common_types.json`, `catalogs/basic/catalog.json`, `catalogs/basic/rules.txt` |

Source URLs (main branch at vendor time):

- https://raw.githubusercontent.com/a2ui-project/a2ui/main/specification/v0_9_1/json/server_to_client.json
- https://raw.githubusercontent.com/a2ui-project/a2ui/main/specification/v0_9_1/json/common_types.json
- https://raw.githubusercontent.com/a2ui-project/a2ui/main/specification/v0_9_1/catalogs/basic/catalog.json
- https://raw.githubusercontent.com/a2ui-project/a2ui/main/specification/v0_9_1/catalogs/basic/rules.txt

## Upgrade

1. Replace the four files under `v0_9_1/` (or add `v1_0/` and point `src/protocol/a2ui/paths.ts` at the new dir).
2. Re-run a smoke: `BENCH_PROTOCOL=a2ui BENCH_SCENARIOS=simple-form BENCH_REPEAT=1 pnpm benchmarks:cli`.
3. If `$id` / `$ref` layout changes, adjust AJV registration in `src/protocol/a2ui/validate.ts`.

Do not depend on the Python `a2ui-agent-sdk` at runtime; prompts assemble these JSON files directly.
