# 安装与配置

本文将帮助你快速安装 GenUI SDK React。

## 安装依赖

进入项目目录并安装 GenUI SDK 与官方 Ant Design 物料包：
::: tabs
== npm
```bash
npm install @opentiny/genui-sdk-react @opentiny/genui-sdk-materials-react-antd antd
```
== pnpm
```bash
pnpm add @opentiny/genui-sdk-react @opentiny/genui-sdk-materials-react-antd antd
```
== yarn
```bash
yarn add @opentiny/genui-sdk-react @opentiny/genui-sdk-materials-react-antd antd
```
:::

## 引入样式

在应用入口引入 Ant Design 样式：

```ts
import 'antd/dist/reset.css';
```

## 物料配置

`GenuiRenderer` 不内置组件物料，需要通过 `GenuiConfigProvider` 的 `materials` 注入。这样可以将 SDK 核心与具体 UI 物料解耦，便于按需替换或扩展组件库。

```tsx
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-react';
import { materials } from '@opentiny/genui-sdk-materials-react-antd/materials';
import 'antd/dist/reset.css';

export function App({ schema }: { schema: string | Record<string, unknown> }) {
  return (
    <GenuiConfigProvider materials={materials}>
      <GenuiRenderer content={schema} />
    </GenuiConfigProvider>
  );
}
```

> 若后端使用 `genui-sdk-server`，服务端还须显式传入本物料包的 `materialsMeta`（`@opentiny/genui-sdk-materials-react-antd/meta`）——服务端不传时只会使用按 `framework` 选中的内置默认物料（Vue → OpenTiny Vue，Angular → OpenTiny Angular），前端一旦使用其他物料（React、Element Plus、mini 精简集、自定义物料等）都必须显式传入，否则服务端默认物料与前端不一致。详见 [Server 包使用文档](../server-usage)。

## 按需引入

`@opentiny/genui-sdk-react` 除主入口外，还提供按功能拆分的子路径导出：

| 子路径 | 适用场景 | 主要导出内容 |
| --- | --- | --- |
| `@opentiny/genui-sdk-react/renderer` | 仅需渲染器 | `GenuiRenderer` |
| `@opentiny/genui-sdk-react/config-provider` | 物料配置容器 | `GenuiConfigProvider` |

```ts
import { GenuiRenderer } from '@opentiny/genui-sdk-react/renderer';
import { GenuiConfigProvider } from '@opentiny/genui-sdk-react/config-provider';
import { materials } from '@opentiny/genui-sdk-materials-react-antd/materials';
```

## 下一步

下一步即可使用 GenuiRenderer 对生成式 UI 进行渲染，请参考 [Renderer 使用指南](start-with-renderer)。

## 其他相关文档

- 查看 [Renderer 使用指南](start-with-renderer) 了解如何使用 `GenuiRenderer` 进行更精细的控制
- 查看 [Renderer 组件文档](../../components/react/renderer) 了解详细的 API
- 查看 [GenuiConfigProvider 组件文档](../../components/react/config-provider) 了解物料注入
- 查看 [特性示例](../../examples/react/renderer/custom-actions) 学习用法示例
- 查看 [React Ant Design 物料包](../../components/materials/react-antd) 了解物料导出
