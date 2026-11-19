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

All three materials objects reuse one `runtimeFactory`. A stable OpenTiny Vue Runtime Root handles both the theme and UI-library locale. It supports `light`, `dark`, and `lite` themes. UI-library locales are declared on `locales`: `zh_CN` / `en_US` / `es_LA` / `pt_BR` (the last two go beyond official GenUI Chat copy). `apply()` matches the id exactly; an unrecognized language falls back to the first item `zh_CN`. See [Materials Runtime](../core/api#imaterialsruntime) and [Internationalization](../../examples/config-provider/i18n). No extra setup is required; set ConfigProvider's `theme` and `locale` props directly:

```typescript
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
import { GenuiChat, GenuiConfigProvider } from '@opentiny/genui-sdk-vue';
```

```vue
<GenuiConfigProvider :materials="materials">
  <GenuiChat />
</GenuiConfigProvider>
```

Theme switching example (`light` / `dark` / `lite` / `auto`):

```vue
<GenuiConfigProvider :materials="materials" theme="dark">
  <GenuiChat />
</GenuiConfigProvider>
```

Use `miniMaterials` / `plusMaterials` as needed, e.g. for the Plus tier:

```typescript
import { plusMaterials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
```

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
