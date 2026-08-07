# Installation and Configuration

This guide helps you install GenUI SDK for React quickly.

## Install dependencies

Go to your project directory and install GenUI SDK and the official Ant Design materials package:

::: tabs
== npm
```bash
npm install @opentiny/genui-sdk-react @opentiny/genui-sdk-materials-react-antd antd
```
== pnpm
```bash
pnpm add @opentiny/genui-sdk-react @opentiny/genui-sdk-materials-react-antd antd
```
== yarn
```bash
yarn add @opentiny/genui-sdk-react @opentiny/genui-sdk-materials-react-antd antd
```
:::

## Import styles

Import Ant Design styles in your app entry:

```ts
import 'antd/dist/reset.css';
```

## Materials configuration

`GenuiRenderer` does not ship built-in materials. Inject them via `GenuiConfigProvider`'s `materials` prop so the SDK core stays decoupled from a specific component library.

```tsx
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-react';
import { materials } from '@opentiny/genui-sdk-materials-react-antd/materials';
import 'antd/dist/reset.css';

export function App({ schema }: { schema: string | Record<string, unknown> }) {
  return (
    <GenuiConfigProvider materials={materials}>
      <GenuiRenderer content={schema} />
    </GenuiConfigProvider>
  );
}
```

## Subpath imports

`@opentiny/genui-sdk-react` also provides feature-split subpath exports:

| Subpath | Use case | Main exports |
| --- | --- | --- |
| `@opentiny/genui-sdk-react/renderer` | Renderer only | `GenuiRenderer` |
| `@opentiny/genui-sdk-react/config-provider` | Materials container | `GenuiConfigProvider` |

```ts
import { GenuiRenderer } from '@opentiny/genui-sdk-react/renderer';
import { GenuiConfigProvider } from '@opentiny/genui-sdk-react/config-provider';
import { materials } from '@opentiny/genui-sdk-materials-react-antd/materials';
```

## Next steps

You can now use `GenuiRenderer` to render generative UI. See the [Renderer usage guide](start-with-renderer).

## Related documentation

- See the [Renderer usage guide](start-with-renderer) to learn how to use `GenuiRenderer` with finer control
- See the [Renderer component docs](../../components/react/renderer) for the full API
- See [React Ant Design materials](../../components/materials/react-antd) for materials exports
