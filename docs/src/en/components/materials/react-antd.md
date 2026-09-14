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
- **Description**: Ant Design component map for ConfigProvider.

```typescript
import { materials } from '@opentiny/genui-sdk-materials-react-antd/materials';
import 'antd/dist/reset.css';
```

```tsx
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-react';

<GenuiConfigProvider materials={materials}>
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
