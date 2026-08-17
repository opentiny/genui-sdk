# a2ui 基准测试方案

## 设计原则

1. **复用现有框架**：不新增包，在 `@opentiny/genui-sdk-benchmarks` 内扩展
2. **与官方一致**：vendor 官方 JSON Schema，参考 A2UI Agent SDK 的 `generate_system_prompt` / DirectJson 拼装模式
3. **双协议切换**：`BENCH_PROTOCOL=genui|a2ui` 环境变量切换（默认 `genui`）
4. **控制变量**：模型、场景、环境相同，仅协议（system 拼装 + 提取/校验）不同
5. **升级友好**：替换 `vendor/a2ui/` 下 schema 文件即可升级协议版本

## 方案设计

### 目标与非目标

| | 说明 |
|--|------|
| **目标** | 在同一套模型 / 场景 / repeat 下，对比 GenUI（`schemaJson` + `genRootSchema`）与 A2UI（`<a2ui-json>` + AJV）的**协议门禁通过率**与性能（TTFT / total / tokens） |
| **非目标** | 不评 A2UI 客户端渲染美观度；不做同一次运行内的双协议并行对比页；不接入 Python `a2ui-agent-sdk`；本轮不定稿 v1.0 |

### 协议版本与 vendor

- **当前版本**：A2UI **v0.9.1**（生产向）+ Basic Catalog
- **目录**：[`vendor/a2ui/v0_9_1/`](../vendor/a2ui/)
  - `json/server_to_client.json`
  - `json/common_types.json`
  - `catalogs/basic/catalog.json`
  - `catalogs/basic/rules.txt`
- **升级**：按 `vendor/a2ui/README.md` 从 [a2ui-project/a2ui](https://github.com/a2ui-project/a2ui) 对应 `specification/` 路径替换文件；必要时改 `src/protocol/a2ui/` 中的版本常量与 `$id` 注册

### Prompt 实现策略

对齐官方 Agent SDK 的 **DirectJson / `generate_system_prompt`**：把协议 schema **嵌入 system**，让模型按示例与规则产出 JSON；基准侧 **不依赖** Python `a2ui-agent-sdk`，在 TS 内复刻同一拼装契约。

#### 分发入口

| 协议 | system 来源 | 代码 |
|------|-------------|------|
| `genui` | `genPrompt(framework, materialsMeta, tgCustomConfig)` + `specificPrompt` + `userAppendPrompt` | `buildSystemPromptForProtocol` |
| `a2ui` | `buildA2uiSystemPrompt({ userAppendPrompt })` | 同上 → [`src/protocol/a2ui/prompt.ts`](../src/protocol/a2ui/prompt.ts) |

`a2ui` 下 **忽略** `framework` / `materialsVariant` / `genPrompt` / GenUI 的 `specificPrompt`（避免再要求 \`\`\`schemaJson\`\`\`）。仅透传 `promptConfig.userAppendPrompt` 作为可选追加段。

#### 拼装顺序（固定）

```text
{role}
## Workflow Description:
{DEFAULT_WORKFLOW_RULES}          # 与官方 constants.py 同文
## UI Description:
{catalogs/basic/rules.txt}        # 必填字段约定；可被 uiDescription 覆盖
---BEGIN A2UI JSON SCHEMA---
### Server To Client Schema: {…}
### Common Types Schema: {…}
### Catalog Schema: {…}
---END A2UI JSON SCHEMA---
{userAppendPrompt?}               # 可选
```

要点：

1. **role**：默认 `Your final output MUST be an A2UI UI definition.`
2. **Workflow**：`<a2ui-json>` / `</a2ui-json>` 包裹；可夹杂对话文本；JSON 须过 schema；`components` 内 **root 优先、父先于子**（便于流式 progressive render）
3. **UI rules**：vendor `rules.txt`（Text/Image/Button 等必填）
4. **Schema 块**：运行时 `JSON.stringify` 读入 vendor 三份 schema（与官方 `render_as_llm_instructions` 分区一致）

#### 刻意不做（MVP）

| 项 | 原因 |
|----|------|
| 注入 Basic Catalog few-shot examples | 控制 prompt token（三份 schema 已约 40KB 量级） |
| 调用 Python `A2uiSchemaManager` | 避免跨运行时依赖；升级只换 vendor 文件 |
| 按场景裁剪 catalog / message 类型 | 先保证协议门禁可比；裁剪属后续优化 |
| 与 GenUI 共用 `specificPrompt` | 两种围栏语义冲突 |
| JSON `repairJson`（GenUI 有） | A2UI 官方契约偏严格 parse；对比时注意不对称 |

重录 contextual 时同一套 `buildA2uiSystemPrompt()`（见 `scripts/capture-a2ui-contextual.mts`），保证历史 assistant 与跑测 system 同源。

#### 与校验 / 观测的衔接

- 模型按 Workflow 产出 → 报告用 `extractAllA2uiJsonBlocks` 抽**全部** `<a2ui-json>` → 逐块 parse + 逐条 AJV（与「one or more blocks」一致）
- `firstObservableComponentMs`：流里首次 `"id": "root"`（见下节），与 Workflow 的 top-down 约定一致

### 三层协议门禁

与 GenUI 报告字段对齐（语义为「协议块」，字段名沿用历史命名）：

| 字段 | A2UI 含义 |
|------|-----------|
| `isSchemaJsonBlockFound` | 是否抽出 `<a2ui-json>`（或等价协议块） |
| `isSchemaJsonValidJson` | 块内是否可解析为 JSON |
| `isSchemaJsonValidAgainstProtocol` | AJV 是否通过 vendored A2UI schema |
| `schemaPassRate` | 上述协议通过率聚合 |

校验对象：消息列表（或单条消息）；每条须为 `createSurface` / `updateComponents` / `updateDataModel` / `deleteSurface` 之一（v0.9.1 envelope）。

### 场景策略

- **共享**：`basic` / `complex` / `edge` / `constraints`（自然语言任务，意图协议无关）
- **contextual 协议分支**（同 id、不同历史）：
  - **genui**：[`contextual-genui.ts`](../src/samples/contextual-genui.ts)（演练场真实 schemaJson 多轮）
  - **a2ui**：[`contextual-a2ui.ts`](../src/samples/contextual-a2ui.ts)（真实模型多轮 `<a2ui-json>` 录制）
- **录制 A2UI 上下文**：`pnpm exec tsx ./scripts/capture-a2ui-contextual.mts`（会覆盖 `contextual-a2ui.ts`）
- 选择逻辑：`getLlmBenchmarkSampleCases(protocol)`，不再因 a2ui「默认排除」contextual

### 首个可观测 UI

| 协议 | 启发式 |
|------|--------|
| genui | 输出中出现 materials `wrapperComponent`（如 `TinyCard`） |
| a2ui | 输出中首次出现 `"id": "root"`（规范：root 定义后才 progressive render；早于真实 paint） |

`createSurface` 或仅出现 `"updateComponents"` 键时界面通常仍空，故不作为首个可观测点。

### 环境变量与跑法

```bash
# GenUI（默认）
pnpm --filter @opentiny/genui-sdk-benchmarks benchmarks:cli

# A2UI 冒烟
BENCH_PROTOCOL=a2ui BENCH_SCENARIOS=simple-form BENCH_REPEAT=1 \
  pnpm --filter @opentiny/genui-sdk-benchmarks benchmarks:cli
```

| 变量 | 值 | 说明 |
|------|-----|------|
| `BENCH_PROTOCOL` | `genui` \| `a2ui` | 默认 `genui` |
| 其余 `BENCH_*` | 同 README | 模型、场景、repeat、并发等与协议无关 |

UI 配置页提供 **protocol** 下拉，写入同字段。

### 报告

- `report.json` → `config.protocol`：`genui` \| `a2ui`
- 样本 JSON 增加可选字段 `protocol`
- 结论页 / insights 用通用「协议块 → JSON → 协议通过」漏斗文案，并在配置区展示 `Protocol`

### 与 GenUI 对照实验

1. 固定：`BENCH_MODEL(S)`、`BENCH_SCENARIOS`、`BENCH_REPEAT`、并发与超时
2. 第一次：`BENCH_PROTOCOL=genui` → 记下 `runDir` / `schemaPassRate` / 性能
3. 第二次：仅改 `BENCH_PROTOCOL=a2ui` → 对比两份 `report.json`（contextual 自动走各自历史）
4. 解读：协议通过率与延迟/token 可对照；**不合成跨协议总分**

### 代码落点

| 路径 | 职责 |
|------|------|
| `vendor/a2ui/` | 官方 schema / rules |
| `src/protocol/a2ui/prompt.ts` | A2UI system 拼装（官方 DirectJson 策略） |
| `src/protocol/a2ui/extract.ts` / `validate.ts` | `<a2ui-json>` 提取 + AJV |
| `src/protocol/resolve.ts` | `buildSystemPromptForProtocol` 等分发 |
| `generate-samples.ts` / `run-report.ts` | 按 `protocol` 分支 |
| `benchmark.config.ts` / `resolve-run-options.ts` | `protocol` + `BENCH_PROTOCOL` |
| `scripts/capture-a2ui-contextual.mts` | 用同一 A2UI prompt 录制 contextual 历史 |

### 后续（本轮不做）

- 同一次运行内 GenUI + A2UI 并行与并排对比页
- vendor v1.0 / 注入官方 few-shot examples
