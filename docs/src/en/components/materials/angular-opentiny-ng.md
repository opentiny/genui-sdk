# Angular OpenTiny NG

`@opentiny/genui-sdk-materials-angular-opentiny-ng` is a materials package based on [OpenTiny NG](https://opentiny.design/tiny-ng/), providing a runtime component map and prompt metadata.

See [Core - IMaterials](../core/api#imaterials) / [IMaterialsMeta](../core/api#imaterialsmeta) for types.

## Exports

| Entry | Exports |
|-------|---------|
| `.` | `materials`, `materialsMeta` |
| `./materials` | `materials` |
| `./meta` | `materialsMeta` |
| `./i18n` | `setLocale`, `runtimeFactory` |

## materials

- **Type**: `IMaterials`
- **Description**: OpenTiny NG component map for ConfigProvider. Its `runtimeFactory` declares `zh_CN` / `en_US` / `es_US` / `fr_FR` / `pt_BR` on `locales`. `apply()` / `setLocale()` match the canonical id and call `TiLocale.setLocale`. This runtime needs no `root` and does not manage themes. If an Angular Custom Element sits outside the Vue `GenuiConfigProvider`, import and call `setLocale()` from `./i18n` when the host locale changes.

```typescript
import { materials } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/materials';
```

```html
<genui-config-provider [materials]="materials">
  <genui-renderer ... />
</genui-config-provider>
```

## materialsMeta

- **Type**: `IMaterialsMeta`
- **Description**: For server-side [`genPrompt`](../core/api#genprompt). `wrapperComponent` defaults to `TiCard`.

```typescript
import { genPrompt } from '@opentiny/genui-sdk-core';
import { materialsMeta } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/meta';

const systemPrompt = genPrompt('Angular', materialsMeta);
```
