# React 集成指南

本指南涵盖将 GenUI SDK 集成到 React 项目中的选型与 skill 增量说明。安装与逐步操作见 `./guides/` 下的同步指南。

## 支持的 React 版本

- **官方支持范围**：React **>= 18**（与 `@opentiny/genui-sdk-react` peer 依赖一致）
- **官方物料**：`@opentiny/genui-sdk-materials-react-antd`（基于 [Ant Design](https://ant.design/)，需项目安装 `antd` 并引入 `antd/dist/reset.css`）

## 集成：GenuiRenderer

- **概况**：React 暂无 `GenuiChat`，使用 `GenuiRenderer` 渲染生成式 UI；流式请求须在 `metadata.tinygenui` 中指定 `framework: 'React'`，以便后端返回 React 兼容 schema。
- **服务端物料必须显式指定**：若后端使用 `genui-sdk-server`，必须在 `startServer` / `equipChatCompletions` 中显式传入 `@opentiny/genui-sdk-materials-react-antd/meta`（服务端不传时只会使用按 `framework` 选中的内置默认物料；React、Element Plus、mini、自定义物料等非默认物料不传都会与前端不一致——例如 `framework: 'React'` 会用到 Vue 默认物料，生成 `TinyButton` 等组件名）；详见 [Server 集成指南](./server.md) 的「物料配置（materialsMeta）」。
- **详细步骤**：[安装与配置](./guides/react-install.md)、[使用 Renderer 组件](./guides/react-start-with-renderer.md)

## 流式数据处理流程

与 Vue 一致：`PatternExtractor` **不**解析 SSE，只消费已解码的 text delta。React 下注意用函数式更新累积 schema（流式回调可能批量到达）：

```tsx
// 伪代码骨架 — 完整实现见 ./guides/react-start-with-renderer.md
const patternExtractor = new PatternExtractor({
  onNormalWrite: () => {},
  onHandledWrite: (schemaChunk) => setSchema((prev) => prev + schemaChunk),
});

// SSE 帧解析 → 提取 delta.content → patternExtractor.handleContent(content)
// 请求进行中 setGenerating(true)，结束或收到 [DONE] 后 setGenerating(false)
```

## 与 Vue / Angular 的主要区别

1. **无 GenuiChat**：React 目前仅有 `GenuiRenderer`，没有集成式 `GenuiChat` 组件
2. **物料单一**：仅提供 Ant Design 官方物料，无 Element Plus / mini 精简集等变体；服务端集成时也必须显式传入该物料的 `materialsMeta`（无内置默认）
3. **`isJsonComplete`**：React 渲染器独有 prop——传入完整 schema **对象**（非流式字符串）时传 `isJsonComplete`，辅助缓冲判断
4. **受控表单**：React 表单组件须用 `value` / `checked` 读取 state，并通过 `onChange` 类型的 `JSFunction` 更新；**不支持** `model: true` 自动生成变更事件（Vue/Angular 路径）
5. **框架 Metadata**：发起请求时须在 `metadata.tinygenui` 中指定 `framework: 'React'`

## 自定义动作

定义可由生成式 UI 触发的动作。

```tsx
import { GenuiRenderer } from '@opentiny/genui-sdk-react';

const customActions = {
  openPage: {
    name: 'openPage',
    description: '打开新页面',
    execute: (params?: { url?: string; target?: string }) => {
      const { url, target = '_self' } = params ?? {};
      if (!url) {
        console.warn('[openPage] missing required param "url", call ignored');
        return;
      }
      window.open(url, target);
    },
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: '要打开的页面地址',
        },
        target: {
          type: 'string',
          description: '打开方式，可选值：_self（当前窗口）、_blank（新窗口）',
        },
      },
      required: ['url', 'target'],
    },
  },
};

export function Example({ schema }: { schema: string }) {
  return <GenuiRenderer content={schema} customActions={customActions} />;
}
```

## 框架 Schema 不正确

**问题**: 生成的 UI 在 React 中无法正常工作

**解决方案**: 在 API 请求中加入 framework metadata：

```typescript
body: JSON.stringify({
  messages: [...],
  model: 'deepseek-v3.2',
  stream: true,
  metadata: {
    tinygenui: JSON.stringify({
      framework: 'React',
    }),
  },
})
```

## 下一步

- 了解 [自定义动作示例](../examples/react/renderer/custom-actions.md)
- 查看 [状态管理示例](../examples/react/renderer/state.md)
- 配置 [必需完整字段选择器](../examples/renderer/required-complete-field-selectors.md)（Vue 示例，机制与 React 一致）以获得更好的流式体验
- 查看 [Renderer 组件 API](./guides/component-react-renderer.md) 与 [GenuiConfigProvider API](./guides/component-react-config-provider.md)
