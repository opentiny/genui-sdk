# Vue OpenTiny Vue

`@opentiny/genui-sdk-materials-vue-opentiny-vue` 基于 [OpenTiny Vue](https://opentiny.design/tiny-vue/) 的物料包，提供运行时组件映射与 Prompt 元数据。

类型定义见 [Core - IMaterials](../core/api#imaterials) / [IMaterialsMeta](../core/api#imaterialsmeta)。

## 导出

| 入口 | 导出 |
|------|------|
| `.` | `materials`、`miniMaterials`、`plusMaterials`、`materialsMeta`、`miniMaterialsMeta`、`plusMaterialsMeta` |
| `./materials` | `materials`、`miniMaterials`、`plusMaterials` |
| `./meta` | `materialsMeta`、`miniMaterialsMeta`、`plusMaterialsMeta` |

## 分层

| 版本 | 定位 | 典型页面 |
|------|------|----------|
| Mini | 轻量表单 / 信息块 | 简单录入、卡片详情 |
| Standard | 数据展示与分析 | 列表+分页、图表看板、Tab 详情 |
| Plus | 完整业务应用页 | 后台管理、组织权限、审批流、门户首页 |

## materials / miniMaterials / plusMaterials

- **类型**: `IMaterials`
- **说明**: OpenTiny Vue 组件映射，注入 [GenuiConfigProvider](../config-provider#materials)。`miniMaterials` 为精简组件集（不含图表等）；`plusMaterials` 面向完整业务页（树、弹窗、时间线等）。

```typescript
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
import { GenuiChat, GenuiConfigProvider } from '@opentiny/genui-sdk-vue';
```

```vue
<GenuiConfigProvider :materials="materials">
  <GenuiChat />
</GenuiConfigProvider>
```

按需选用 `miniMaterials` / `plusMaterials`，例如 Plus 分层：

```typescript
import { plusMaterials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
```

```vue
<GenuiConfigProvider :materials="plusMaterials">
  <GenuiChat />
</GenuiConfigProvider>
```

## materialsMeta / miniMaterialsMeta / plusMaterialsMeta

- **类型**: `IMaterialsMeta`
- **说明**: 供服务端 [`genPrompt`](../core/api#genprompt) 使用。`wrapperComponent` 默认为 `TinyCard`。按需选用 `miniMaterialsMeta` / `materialsMeta` / `plusMaterialsMeta`。

```typescript
import { genPrompt } from '@opentiny/genui-sdk-core';
import { materialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';

const systemPrompt = genPrompt('Vue', materialsMeta);
```

Plus 分层示例：

```typescript
import { genPrompt } from '@opentiny/genui-sdk-core';
import { plusMaterialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';

const systemPrompt = genPrompt('Vue', plusMaterialsMeta);
```
