# Vue OpenTiny Vue

`@opentiny/genui-sdk-materials-vue-opentiny-vue` 基于 [OpenTiny Vue](https://opentiny.design/tiny-vue/) 的物料包，提供运行时组件映射与 Prompt 元数据。

类型定义见 [Core - IMaterials](https://docs.opentiny.design/genui-sdk/components/core/api#imaterials) / [IMaterialsMeta](https://docs.opentiny.design/genui-sdk/components/core/api#imaterialsmeta)。

## 导出

| 入口 | 导出 |
|------|------|
| `.` | `materials`、`miniMaterials`、`materialsMeta`、`miniMaterialsMeta` |
| `./materials` | `materials`、`miniMaterials` |
| `./meta` | `materialsMeta`、`miniMaterialsMeta` |

## materials / miniMaterials

- **类型**: `IMaterials`
- **说明**: OpenTiny Vue 组件映射，注入 [GenuiConfigProvider](../vue.md)。`miniMaterials` 为精简组件集（不含图表等）。

```typescript
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
import { GenuiChat, GenuiConfigProvider } from '@opentiny/genui-sdk-vue';
```

```vue
<GenuiConfigProvider :materials="materials">
  <GenuiChat />
</GenuiConfigProvider>
```

## materialsMeta / miniMaterialsMeta

- **类型**: `IMaterialsMeta`
- **说明**: 供服务端 [`genPrompt`](https://docs.opentiny.design/genui-sdk/components/core/api#genprompt) 使用。`wrapperComponent` 默认为 `TinyCard`。`miniMaterialsMeta` 对应精简组件的物料。

```typescript
import { genPrompt } from '@opentiny/genui-sdk-core';
import { materialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';

const systemPrompt = genPrompt('Vue', materialsMeta);
```
