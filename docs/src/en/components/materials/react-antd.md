# React Ant Design

`@opentiny/genui-sdk-materials-react-antd` is a materials package based on [Ant Design](https://ant.design/), providing a runtime component map and prompt metadata.

See [Core - IMaterials](../core/api#imaterials) / [IMaterialsMeta](../core/api#imaterialsmeta) for types.

## Exports

| Entry | Exports |
|-------|---------|
| `.` | `materials`, `materialsMeta` |
| `./materials` | `materials` |
| `./meta` | `materialsMeta` |

## materials

- **Type**: `IMaterials`
- **Description**: Ant Design component map for ConfigProvider. It ships a `runtimeFactory` that uses Ant Design's `ConfigProvider` for theme and locale: `theme` supports `light` / `dark` (`defaultAlgorithm` / `darkAlgorithm`), and `locales` declares `zh_CN` / `en_US` / `es_ES` / `fr_FR` / `pt_BR`. `apply()` returns an Ant Design `ConfigProvider` as `root`; GenUI ConfigProvider renders it around the content. The root reference is stable, so changing theme or locale does not recreate the rendered subtree.

```typescript
import { materials } from '@opentiny/genui-sdk-materials-react-antd/materials';
import 'antd/dist/reset.css';
```

```tsx
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-react';

<GenuiConfigProvider materials={materials} theme="dark" locale="en_US">
  <GenuiRenderer content={schema} />
</GenuiConfigProvider>
```

## materialsMeta

- **Type**: `IMaterialsMeta`
- **Description**: For server-side [`genPrompt`](../core/api#genprompt). `wrapperComponent` defaults to `AntCard`.

```typescript
import { genPrompt } from '@opentiny/genui-sdk-core';
import { materialsMeta } from '@opentiny/genui-sdk-materials-react-antd/meta';

const systemPrompt = genPrompt('React', materialsMeta);
```
