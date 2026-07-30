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

Use `miniMaterials` / `miniMaterialsMeta` when you need a smaller component set (without charts).

## API

| Export Path | Exports | Description |
|-------------|---------|-------------|
| `@opentiny/genui-sdk-materials-vue-opentiny-vue` | `materials`, `miniMaterials`, `materialsMeta`, `miniMaterialsMeta` | Unified entry |
| `.../materials` | `materials`, `miniMaterials` | Inject into `ConfigProvider` for schema rendering |
| `.../meta` | `materialsMeta`, `miniMaterialsMeta` | For `genPrompt()` / building the server system prompt |

### `materials` / `miniMaterials`

Component registry mapping OpenTiny Vue components, used by the renderer to resolve nodes by `componentName`.

### `materialsMeta` / `miniMaterialsMeta`

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
