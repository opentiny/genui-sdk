# Angular OpenTiny NG

`@opentiny/genui-sdk-materials-angular-opentiny-ng` 基于 [OpenTiny NG](https://opentiny.design/tiny-ng/) 的物料包，提供运行时组件映射与 Prompt 元数据。

类型定义见 [Core - IMaterials](../core/api#imaterials) / [IMaterialsMeta](../core/api#imaterialsmeta)。

## 导出

| 入口 | 导出 |
|------|------|
| `.` | `materials`、`materialsMeta` |
| `./materials` | `materials` |
| `./meta` | `materialsMeta` |
| `./i18n` | `materialsI18n` |

## materials

- **类型**: `IMaterials`
- **说明**: OpenTiny NG 组件映射，注入 ConfigProvider。已内置 `materials.i18n`（写入 `window.tiLocale`）。纯 Angular 应用可随物料注入使用；若在 Vue 宿主中通过 Custom Element 嵌入，需由宿主在切换语言时同步 TinyNG locale（例如调用物料包的 `i18n.setLocale`）。

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
