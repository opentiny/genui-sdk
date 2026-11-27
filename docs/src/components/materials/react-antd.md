# React Ant Design

`@opentiny/genui-sdk-materials-react-antd` 基于 [Ant Design](https://ant.design/) 的物料包，提供运行时组件映射与 Prompt 元数据。

类型定义见 [Core - IMaterials](../core/api#imaterials) / [IMaterialsMeta](../core/api#imaterialsmeta)。

## 导出

| 入口 | 导出 |
|------|------|
| `.` | `materials`、`materialsMeta` |
| `./materials` | `materials` |
| `./meta` | `materialsMeta` |

## materials

- **类型**: `IMaterials`
- **说明**: Ant Design 组件映射，注入 ConfigProvider。已内置 `runtimeFactory`，通过 Ant Design 的 `ConfigProvider` 处理主题与语言：`theme` 支持 `light` / `dark`（对应 `defaultAlgorithm` / `darkAlgorithm`），`locales` 声明 `zh_CN` / `en_US` / `es_ES` / `fr_FR` / `pt_BR`。`apply()` 返回的 `root` 是 Ant Design 的 `ConfigProvider`，由 GenUI ConfigProvider 渲染在内容外层；root 引用稳定，切换主题/语言不会重建渲染子树。

```typescript
import { materials } from '@opentiny/genui-sdk-materials-react-antd/materials';
import 'antd/dist/reset.css';
```

```tsx
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-react';

<GenuiConfigProvider materials={materials} theme="dark" locale="en_US">
  <GenuiRenderer content={schema} />
</GenuiConfigProvider>
```

## materialsMeta

- **类型**: `IMaterialsMeta`
- **说明**: 供服务端 [`genPrompt`](../core/api#genprompt) 使用。`wrapperComponent` 默认为 `AntCard`。

```typescript
import { genPrompt } from '@opentiny/genui-sdk-core';
import { materialsMeta } from '@opentiny/genui-sdk-materials-react-antd/meta';

const systemPrompt = genPrompt('React', materialsMeta);
```
