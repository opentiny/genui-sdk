# @opentiny/genui-sdk-materials-vue-element-plus

A GenUI Vue materials package based on [Element Plus](https://element-plus.org/), for schema-driven page generation and rendering.

## Install

```bash
npm install @opentiny/genui-sdk-materials-vue-element-plus element-plus vue
```

Peer dependencies `vue` and `element-plus` must also be installed.

## Quick Start

### Frontend Rendering

Import Element Plus styles at the app entry, and inject materials via `ConfigProvider`:

```ts
import 'element-plus/dist/index.css';
import { GenuiConfigProvider } from '@opentiny/genui-sdk-vue';
import { materials } from '@opentiny/genui-sdk-materials-vue-element-plus/materials';
```

```vue
<GenuiConfigProvider :materials="materials">
  <GenuiChat />
</GenuiConfigProvider>
```

### Generate LLM Prompt (Server)

```ts
import { genPrompt } from '@opentiny/genui-sdk-core';
import { materialsMeta } from '@opentiny/genui-sdk-materials-vue-element-plus/meta';

const systemPrompt = genPrompt('Vue', materialsMeta, customConfig);
```

`materialsMeta.wrapperComponent` defaults to `ElCard`.

## API

| Export Path | Exports | Description |
|-------------|---------|-------------|
| `@opentiny/genui-sdk-materials-vue-element-plus` | `materials`, `materialsMeta` | Unified entry |
| `.../materials` | `materials` | Inject into `ConfigProvider` for schema rendering |
| `.../meta` | `materialsMeta` | For `genPrompt()` / building the server system prompt |

### `materials`

Component registry mapping Element Plus components, used by the renderer to resolve nodes by `componentName`.

### `materialsMeta`

Materials metadata, including:

- `materials`: Protocol descriptions for components / blocks / snippets
- `wrapperComponent`: Default wrapper component (`ElCard`)
- `whiteList`: Whitelist of `componentName` values available to the LLM
- `examples`: Prompt example schemas (form / info / table)
- `rules`: Extra constraint rules

Component library: `element-plus`.

## More

For package development, local demos, and extending components, see [CONTRIBUTING.md](./CONTRIBUTING.md).
