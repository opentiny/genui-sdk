# Vue Element Plus

`@opentiny/genui-sdk-materials-vue-element-plus` is a materials package based on [Element Plus](https://element-plus.org/), providing a runtime component map and prompt metadata.

See [Core - IMaterials](../core/api#imaterials) / [IMaterialsMeta](../core/api#imaterialsmeta) for types.

## Exports

| Entry | Exports |
|-------|---------|
| `.` | `materials`, `materialsMeta` |
| `./materials` | `materials` |
| `./meta` | `materialsMeta` |

## materials

- **Type**: `IMaterials`
- **Description**: Element Plus component map for [GenuiConfigProvider](../config-provider#materials).

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

- **Type**: `IMaterialsMeta`
- **Description**: For server-side [`genPrompt`](../core/api#genprompt). `wrapperComponent` defaults to `ElCard`.

```typescript
import { genPrompt } from '@opentiny/genui-sdk-core';
import { materialsMeta } from '@opentiny/genui-sdk-materials-vue-element-plus/meta';

const systemPrompt = genPrompt('Vue', materialsMeta);
```
