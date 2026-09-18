# Angular OpenTiny NG

`@opentiny/genui-sdk-materials-angular-opentiny-ng` 基于 [OpenTiny NG](https://opentiny.design/tiny-ng/) 的物料包，提供运行时组件映射与 Prompt 元数据。

类型定义见 [Core - IMaterials](../core/api#imaterials) / [IMaterialsMeta](../core/api#imaterialsmeta)。

## 导出

| 入口 | 导出 |
|------|------|
| `.` | `materials`、`materialsMeta` |
| `./materials` | `materials` |
| `./meta` | `materialsMeta` |
| `./i18n` | `setLocale`、`runtimeFactory` |

## materials

- **类型**: `IMaterials`
- **说明**: OpenTiny NG 组件映射，注入 ConfigProvider。已内置 `runtimeFactory`，其 `apply()` 会把 GenUI locale 映射并写入 `window.tiLocale`；该运行时不需要 `root`，也不处理主题。若 Angular Custom Element 位于 Vue `GenuiConfigProvider` 之外，宿主切换语言时需从 `./i18n` 导入并调用 `setLocale()` 手动同步 TinyNG locale。

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
- **说明**: 供服务端 [`genPrompt`](../core/api#genprompt) 使用。`wrapperComponent` 默认为 `TiCard`。

```typescript
import { genPrompt } from '@opentiny/genui-sdk-core';
import { materialsMeta } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/meta';

const systemPrompt = genPrompt('Angular', materialsMeta);
```
