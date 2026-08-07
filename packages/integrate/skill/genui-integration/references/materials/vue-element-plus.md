# Vue Element Plus

`@opentiny/genui-sdk-materials-vue-element-plus` 基于 [Element Plus](https://element-plus.org/) 的物料包，提供运行时组件映射与 Prompt 元数据。

类型定义见 [Core - IMaterials](https://docs.opentiny.design/genui-sdk/components/core/api#imaterials) / [IMaterialsMeta](https://docs.opentiny.design/genui-sdk/components/core/api#imaterialsmeta)。

## 导出

| 入口 | 导出 |
|------|------|
| `.` | `materials`、`materialsMeta` |
| `./materials` | `materials` |
| `./meta` | `materialsMeta` |

## materials

- **类型**: `IMaterials`
- **说明**: Element Plus 组件映射，注入 [GenuiConfigProvider](../vue.md)。

```typescript
import 'element-plus/dist/index.css';
import { materials } from '@opentiny/genui-sdk-materials-vue-element-plus/materials';
import { GenuiChat, GenuiConfigProvider } from '@opentiny/genui-sdk-vue';
```

```vue
<GenuiConfigProvider :materials="materials">
  <GenuiChat />
</GenuiConfigProvider>
```

## materialsMeta

- **类型**: `IMaterialsMeta`
- **说明**: 供服务端 [`genPrompt`](https://docs.opentiny.design/genui-sdk/components/core/api#genprompt) 使用。`wrapperComponent` 默认为 `ElCard`。

```typescript
import { genPrompt } from '@opentiny/genui-sdk-core';
import { materialsMeta } from '@opentiny/genui-sdk-materials-vue-element-plus/meta';

const systemPrompt = genPrompt('Vue', materialsMeta);
```
