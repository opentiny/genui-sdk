# Vue OpenTiny Vue

`@opentiny/genui-sdk-materials-vue-opentiny-vue` is a materials package based on [OpenTiny Vue](https://opentiny.design/tiny-vue/), providing a runtime component map and prompt metadata.

See [Core - IMaterials](../core/api#imaterials) / [IMaterialsMeta](../core/api#imaterialsmeta) for types.

## Exports

| Entry | Exports |
|-------|---------|
| `.` | `materials`, `miniMaterials`, `materialsMeta`, `miniMaterialsMeta` |
| `./materials` | `materials`, `miniMaterials` |
| `./meta` | `materialsMeta`, `miniMaterialsMeta` |

## materials / miniMaterials

- **Type**: `IMaterials`
- **Description**: OpenTiny Vue component map for [GenuiConfigProvider](../config-provider#materials). `miniMaterials` is a smaller set (without charts, etc.).

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

- **Type**: `IMaterialsMeta`
- **Description**: For server-side [`genPrompt`](../core/api#genprompt). `wrapperComponent` defaults to `TinyCard`. `miniMaterialsMeta` pairs with the mini whitelist and examples.

```typescript
import { genPrompt } from '@opentiny/genui-sdk-core';
import { materialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';

const systemPrompt = genPrompt('Vue', materialsMeta);
```
