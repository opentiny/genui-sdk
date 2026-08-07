# Angular OpenTiny NG

`@opentiny/genui-sdk-materials-angular-opentiny-ng` 基于 [OpenTiny NG](https://opentiny.design/tiny-ng/) 的物料包，提供运行时组件映射与 Prompt 元数据。

类型定义见 [Core - IMaterials](https://docs.opentiny.design/genui-sdk/components/core/api#imaterials) / [IMaterialsMeta](https://docs.opentiny.design/genui-sdk/components/core/api#imaterialsmeta)。

## 导出

| 入口 | 导出 |
|------|------|
| `.` | `materials`、`materialsMeta` |
| `./materials` | `materials` |
| `./meta` | `materialsMeta` |

## materials

- **类型**: `IMaterials`
- **说明**: OpenTiny NG 组件映射，注入 ConfigProvider。

```typescript
import { materials } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/materials';
```

```html
<genui-config-provider [materials]="materials">
  <genui-renderer ... />
</genui-config-provider>
```

## materialsMeta

- **类型**: `IMaterialsMeta`
- **说明**: 供服务端 [`genPrompt`](https://docs.opentiny.design/genui-sdk/components/core/api#genprompt) 使用。`wrapperComponent` 默认为 `TiCard`。

```typescript
import { genPrompt } from '@opentiny/genui-sdk-core';
import { materialsMeta } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/meta';

const systemPrompt = genPrompt('Angular', materialsMeta);
```
