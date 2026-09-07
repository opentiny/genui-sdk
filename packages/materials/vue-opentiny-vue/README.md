# @opentiny/genui-sdk-materials-vue-opentiny-vue


A GenUI Vue materials package based on [OpenTiny Vue](https://opentiny.design/tiny-vue/), for schema-driven page generation and rendering.

## Install

```bash
npm install @opentiny/genui-sdk-materials-vue-opentiny-vue @opentiny/genui-sdk-vue @opentiny/genui-sdk-core
```

## Quick Start

### Frontend Rendering

Inject materials via `ConfigProvider`:

```ts
import { GenuiConfigProvider, GenuiChat } from '@opentiny/genui-sdk-vue';
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
```

```vue
<GenuiConfigProvider :materials="materials">
  <GenuiChat />
</GenuiConfigProvider>
```

### Generate LLM Prompt (Server)

```ts
import { genPrompt } from '@opentiny/genui-sdk-core';
import { materialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';

const systemPrompt = genPrompt('Vue', materialsMeta, customConfig);
```

`materialsMeta.wrapperComponent` defaults to `TinyCard`.

Use `miniMaterials` / `miniMaterialsMeta` for a smaller set (forms/tables, no charts).
Use `plusMaterials` / `plusMaterialsMeta` for full business pages (tree, dialog, timeline, etc.).

For Plus tier, import the `plus` entries instead:

```ts
import { GenuiConfigProvider, GenuiChat } from '@opentiny/genui-sdk-vue';
import { plusMaterials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
import { genPrompt } from '@opentiny/genui-sdk-core';
import { plusMaterialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';
```

```vue
<GenuiConfigProvider :materials="plusMaterials">
  <GenuiChat />
</GenuiConfigProvider>
```

```ts
const systemPrompt = genPrompt('Vue', plusMaterialsMeta, customConfig);
```

## API

| Export Path | Exports | Description |
|-------------|---------|-------------|
| `@opentiny/genui-sdk-materials-vue-opentiny-vue` | `materials`, `miniMaterials`, `plusMaterials`, `materialsMeta`, `miniMaterialsMeta`, `plusMaterialsMeta` | Unified entry |
| `.../materials` | `materials`, `miniMaterials`, `plusMaterials` | Inject into `ConfigProvider` for schema rendering |
| `.../meta` | `materialsMeta`, `miniMaterialsMeta`, `plusMaterialsMeta` | For `genPrompt()` / building the server system prompt |

### Tiering

| Tier | Positioning | Typical pages |
|------|-------------|---------------|
| Mini | Lightweight form / info blocks | Simple forms, card details |
| Standard | Data display & analytics | List + pager, charts, tabbed detail |
| Plus | Full business application pages | Admin, org/permission, approval, portal |

### `materials` / `miniMaterials` / `plusMaterials`

Component registry mapping OpenTiny Vue components, used by the renderer to resolve nodes by `componentName`.

### `materialsMeta` / `miniMaterialsMeta` / `plusMaterialsMeta`

Materials metadata, including:

- `materials`: Protocol descriptions for components / blocks / snippets
- `wrapperComponent`: Default wrapper component (`TinyCard`)
- `whiteList`: Whitelist of `componentName` values available to the LLM
- `examples`: Prompt example schemas (form / info / grid / tabs)
- `rules`: Extra constraint rules

Component library: `@opentiny/vue-*`.

## More

- [GenUI SDK](https://opentiny.design/genui-sdk)
- [Renderer Guide](https://docs.opentiny.design/genui-sdk/components/renderer)
