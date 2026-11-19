# Angular OpenTiny NG

`@opentiny/genui-sdk-materials-angular-opentiny-ng` 基于 [OpenTiny NG](https://opentiny.design/tiny-ng/) 的物料包，提供运行时组件映射与 Prompt 元数据。

类型定义见 [Core - IMaterials](../core/api#imaterials) / [IMaterialsMeta](../core/api#imaterialsmeta)。

## 导出

| 入口 | 导出 |
|------|------|
| `.` | `materials`、`materialsMeta` |
| `./materials` | `materials` |
| `./meta` | `materialsMeta` |

## materials

- **类型**: `IMaterials`
- **说明**: OpenTiny NG 组件映射，注入 ConfigProvider。已内置 `runtimeFactory`，`locales` 声明 `zh_CN` / `en_US` / `es_US` / `fr_FR` / `pt_BR`，由 ConfigProvider 的 `locale` 输入驱动，按规范 id 匹配后调用 `TiLocale.setLocale`。该运行时的 `apply()` 只返回 `locale`，不返回 `root`，也不处理主题。locale 是 TinyNG 的全局设置，已挂载的组件不会自动响应，切换语言时需重建渲染内容（playground 的 Angular CE 通过重挂载处理）。

```typescript
import { materials } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/materials';
```

```html
<genui-config-provider [materials]="materials" locale="zh_CN">
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
