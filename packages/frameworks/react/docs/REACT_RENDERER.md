# @opentiny/genui-sdk-react

与 UI 组件库无关的 React Schema 渲染器，实现 `@opentiny/genui-sdk-core` 定义的 Page/Node 树协议。

## 架构

与 Vue 一致：`SchemaCardRenderer`（流式） + `SchemaRenderer`（基础渲染器，对齐 tiny-schema-renderer）。

```
GenuiRenderer（= SchemaCardRenderer，流式 JSON：repairJson + DeltaPatcher）
  └── PageContextProvider
        └── SchemaRenderer（递归 Node 树，ref: setContext / getContext / setState）
              ├── registry 组件（Box、Text…）
              └── 原生 HTML 透传（div、input、button…）

Playground ?framework=react：Vue SchemaCardRenderer 已做流式合并，适配器只挂载 SchemaRenderer（不再二次 DeltaPatcher）
```

## 快速开始

```tsx
import { GenuiRenderer } from '@opentiny/genui-sdk-react';
import { nativeFormExample } from '@opentiny/genui-sdk-materials-react-antd/render-config';

<GenuiRenderer content={nativeFormExample} isJsonComplete />;
```

## 扩展组件库

```tsx
import {
  SchemaRenderer,
  PageContextProvider,
  defineRegistry,
  mergeRegistry,
  builtinRegistry,
} from '@opentiny/genui-sdk-react';

const registry = mergeRegistry(builtinRegistry, {
  MyCard: ({ props, children }) => <div className="card">{props.title}{children}</div>,
});

<PageContextProvider>
  <SchemaRenderer ref={rendererRef} schema={schema} registry={registry} />
</PageContextProvider>
```

已有完整 schema 对象、不需要流式修补时，直接用 `SchemaRenderer`；字符串/增量 JSON 用 `GenuiRenderer` 或 `SchemaCardRenderer`。

## LLM Prompt

`reactAntdRendererConfig`（`@opentiny/genui-sdk-materials-react-antd/render-config`）包含 builtin 原生 HTML 与 antd 组件白名单。

服务端示例：

```ts
import { reactAntdRendererConfig } from '@opentiny/genui-sdk-materials-react-antd/render-config';
genPrompt(reactAntdRendererConfig, customConfig);
```

## 与 Vue / json-render 的差异

| 项 | genui-sdk-react | json-render/react |
|----|-----------------|-------------------|
| 结构 | 嵌套 `children` | flat `elements` map |
| 组件名 | `componentName` | `type` |
| 绑定 | `JSExpression` + `model: true` | `$bindState` |

## Playground 测试

- 独立演示：`pnpm dev` 后访问 `/react-demo.html`（Ant Design 表单）
- 聊天流式：`?framework=react`（Vue 壳 + `SchemaRendererReactAdapter` + antd 物料包）

Ant Design 物料包与 Playground 集成说明见 [`packages/materials/react-antd/README.md`](../../materials/react-antd/README.md)。

## 安全说明

与 `tiny-schema-renderer` 相同，使用 `Function` + `with` 执行 schema 中的表达式，仅用于受信 LLM 输出环境。
