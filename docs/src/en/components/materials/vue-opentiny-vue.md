# Vue OpenTiny Vue

`@opentiny/genui-sdk-materials-vue-opentiny-vue` is a materials package based on [OpenTiny Vue](https://opentiny.design/tiny-vue/), providing a runtime component map and prompt metadata.

See [Core - IMaterials](../core/api#imaterials) / [IMaterialsMeta](../core/api#imaterialsmeta) for types.

## Exports

| Entry | Exports |
|-------|---------|
| `.` | `materials`, `miniMaterials`, `plusMaterials`, `materialsMeta`, `miniMaterialsMeta`, `plusMaterialsMeta` |
| `./materials` | `materials`, `miniMaterials`, `plusMaterials` |
| `./meta` | `materialsMeta`, `miniMaterialsMeta`, `plusMaterialsMeta` |

## Tiering

| Tier | Positioning | Typical pages |
|------|-------------|----------------|
| Mini | Lightweight form / info blocks | Simple forms, card details |
| Standard | Data display & analytics | List + pager, charts, tabbed detail |
| Plus | Full business application pages | Admin, org/permission, approval, portal |

## materials / miniMaterials / plusMaterials

- **Type**: `IMaterials`
- **Description**: OpenTiny Vue component map for [GenuiConfigProvider](../config-provider#materials). `miniMaterials` is a smaller set (without charts, etc.); `plusMaterials` targets full business pages (tree, dialog, timeline, etc.).

```typescript
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
import { GenuiChat, GenuiConfigProvider } from '@opentiny/genui-sdk-vue';
```

```vue
<GenuiConfigProvider :materials="materials">
  <GenuiChat />
</GenuiConfigProvider>
```

Use `miniMaterials` / `plusMaterials` as needed, e.g. for the Plus tier:

```vue
<GenuiConfigProvider :materials="plusMaterials">
  <GenuiChat />
</GenuiConfigProvider>
```

## materialsMeta / miniMaterialsMeta / plusMaterialsMeta

- **Type**: `IMaterialsMeta`
- **Description**: For server-side [`genPrompt`](../core/api#genprompt). `wrapperComponent` defaults to `TinyCard`. Use `miniMaterialsMeta` / `materialsMeta` / `plusMaterialsMeta` as needed.

```typescript
import { genPrompt } from '@opentiny/genui-sdk-core';
import { materialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';

const systemPrompt = genPrompt('Vue', materialsMeta);
```

For the Plus tier:

```typescript
import { genPrompt } from '@opentiny/genui-sdk-core';
import { plusMaterialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';

const systemPrompt = genPrompt('Vue', plusMaterialsMeta);
```
