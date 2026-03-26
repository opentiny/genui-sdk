# @opentiny/genui-brenchmarks

`@opentiny/genui-sdk-core` 的大模型生成基准测试框架，参考 `openui/benchmarks` 的运行方式，聚焦四个指标：

- `schemaJson` 合法性（代码块存在 / JSON 可解析 / 协议校验）
- 首字节生成速度（TTFT）
- 任务完成速度（total latency）
- token 消耗量（prompt / completion / total）

## 目录结构

```text
src/
├── framework/
│   ├── types.ts
│   ├── reporter.ts
│   ├── runner.ts
│   └── index.ts
├── examples/
│   └── index.ts
├── utils/
│   ├── extract-schema-json.ts
│   └── fs-paths.ts
├── generate-samples.ts
├── run-report.ts
└── index.ts
```

## 前置条件

```bash
export OPENAI_API_KEY=sk-...
```

## 运行方式

1) 先批量生成样本（在线调用模型）：

```bash
pnpm --filter @opentiny/genui-brenchmarks generate
```

2) 再根据样本离线统计：

```bash
pnpm --filter @opentiny/genui-brenchmarks report
```

一键执行两阶段：

```bash
pnpm --filter @opentiny/genui-brenchmarks bench
```

指定模型：

```bash
pnpm --filter @opentiny/genui-brenchmarks bench -- --model gpt-4o-mini
```

按场景：

```bash
pnpm --filter @opentiny/genui-brenchmarks bench -- --scenario simple-form
```

JSON 输出：

```bash
pnpm --filter @opentiny/genui-brenchmarks report:json
```

报告文件会默认输出到 `samples/reports/`：

- `benchmark-latest.json`
- `benchmark-latest.html`（图表页，可直接浏览器打开）

## 输出说明

- `isSchemaJsonBlockFound`: 是否检测到 ```schemaJson ...``` 代码块
- `isSchemaJsonValidJson`: 代码块内容是否为合法 JSON
- `isSchemaJsonValidAgainstProtocol`: 是否通过 `genRootSchema()` 协议校验
- `ttftMs`: 从请求发出到首个输出 token 的耗时
- `totalMs`: 请求到完整结束耗时
- `promptTokens` / `completionTokens` / `totalTokens`: 由模型 usage 返回的 token 统计
