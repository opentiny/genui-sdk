# @opentiny/genui-sdk-materials-react-antd

A GenUI React materials package based on [Ant Design](https://ant.design/), for schema-driven page generation and rendering.

## Install

```bash
npm install @opentiny/genui-sdk-materials-react-antd @opentiny/genui-sdk-react @opentiny/genui-sdk-core antd
```

## Quick Start

### Frontend Rendering

Inject materials via `GenuiConfigProvider`:

```tsx
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-react';
import { materials } from '@opentiny/genui-sdk-materials-react-antd/materials';
import 'antd/dist/reset.css';

<GenuiConfigProvider materials={materials}>
  <GenuiRenderer content={schema} isJsonComplete />
</GenuiConfigProvider>
```

### Generate LLM Prompt (Server)

```ts
import { genPrompt } from '@opentiny/genui-sdk-core';
import { materialsMeta } from '@opentiny/genui-sdk-materials-react-antd/meta';

const systemPrompt = genPrompt('React', materialsMeta, customConfig);
```

`materialsMeta.wrapperComponent` defaults to `AntCard`.

## API

| Export Path | Exports | Description |
|-------------|---------|-------------|
| `@opentiny/genui-sdk-materials-react-antd` | `materials`, `materialsMeta` | Unified entry |
| `.../materials` | `materials` | Inject into `GenuiConfigProvider` for schema rendering |
| `.../meta` | `materialsMeta` | For `genPrompt()` / building the server system prompt |

### `materials`

Component registry mapping Ant Design components, used by the renderer to resolve nodes by `componentName`.

### `materialsMeta`

Materials metadata, including:

- `materials`: Protocol descriptions for components
- `wrapperComponent`: Default wrapper component (`AntCard`)
- `whiteList`: Whitelist of `componentName` values available to the LLM
- `examples`: Prompt example schemas

## More

- [GenUI SDK](https://opentiny.design/genui-sdk)
- [Vue OpenTiny materials](../vue-opentiny-vue/)（同类参考实现）
