# @opentiny/genui-sdk-materials-angular-opentiny-ng


A GenUI Angular materials package based on [OpenTiny NG](https://opentiny.design/tiny-ng/), providing materials metadata for schema-driven page generation.

## Install

```bash
npm install @opentiny/genui-sdk-materials-angular-opentiny-ng @opentiny/genui-sdk-core
```

## Quick Start

### Generate LLM Prompt (Server)

```ts
import { genPrompt } from '@opentiny/genui-sdk-core';
import { materialsMeta } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/meta';

const systemPrompt = genPrompt('Angular', materialsMeta, customConfig);
```

`materialsMeta.wrapperComponent` defaults to `TiCard`.

### Default Props (Angular ConfigProvider)

Pass `materialsMeta` via `rendererConfig` so the renderer can derive component default props:

```ts
import { materialsMeta } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/meta';
```

```html
<genui-config-provider [rendererConfig]="materialsMeta">
  <genui-renderer ... />
</genui-config-provider>
```

## API

| Export Path | Exports | Description |
|-------------|---------|-------------|
| `@opentiny/genui-sdk-materials-angular-opentiny-ng` | `materialsMeta` | Unified entry |
| `.../meta` | `materialsMeta` | For `genPrompt()` / building the server system prompt |

### `materialsMeta`

Materials metadata, including:

- `materials`: Protocol descriptions for components / blocks / snippets
- `wrapperComponent`: Default wrapper component (`TiCard`)
- `whiteList`: Whitelist of `componentName` values available to the LLM
- `examples`: Prompt example schemas

Component library: `@opentiny/ng`.

## More

- [GenUI SDK](https://opentiny.design/genui-sdk)
