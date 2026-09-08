# Angular OpenTiny NG

`@opentiny/genui-sdk-materials-angular-opentiny-ng` is a materials package based on [OpenTiny NG](https://opentiny.design/tiny-ng/), providing a runtime component map and prompt metadata.

See [Core - IMaterials](../core/api#imaterials) / [IMaterialsMeta](../core/api#imaterialsmeta) for types.

## Exports

| Entry | Exports |
|-------|---------|
| `.` | `materials`, `materialsMeta` |
| `./materials` | `materials` |
| `./meta` | `materialsMeta` |
| `./i18n` | `materialsI18n` |

## materials

- **Type**: `IMaterials`
- **Description**: OpenTiny NG component map for ConfigProvider. Includes built-in `materials.i18n` (writes `window.tiLocale`). In a pure Angular app this works with materials injection; when embedded as a Custom Element inside a Vue host, the host must sync TinyNG locale on language switch (for example by calling the materials package `i18n.setLocale`).

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
