# @opentiny/genui-sdk-react

A React renderer for the GenUI schema protocol. Stream AI-generated structured output into interactive UI with materials injection.

[Learn more about GenUI SDK](https://opentiny.design/genui-sdk).

## Usage

Install together with core and the React materials package (the base schema renderer is bundled in this package):

```bash
pnpm add @opentiny/genui-sdk-react @opentiny/genui-sdk-core @opentiny/genui-sdk-materials-react-antd antd
```

```tsx
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-react';
import { materials } from '@opentiny/genui-sdk-materials-react-antd/materials';
import 'antd/dist/reset.css';

export function App({ schema }: { schema: unknown }) {
  return (
    <GenuiConfigProvider materials={materials}>
      <GenuiRenderer content={schema} isJsonComplete />
    </GenuiConfigProvider>
  );
}
```

## Documentation

* [install](https://docs.opentiny.design/genui-sdk/guide/react/install)
* [start-with-renderer](https://docs.opentiny.design/genui-sdk/guide/react/start-with-renderer)

## API

* [GenuiRenderer](https://docs.opentiny.design/genui-sdk/components/react/renderer)
* [GenuiConfigProvider](https://docs.opentiny.design/genui-sdk/components/react/config-provider)
* [React Ant Design materials](https://docs.opentiny.design/genui-sdk/components/materials/react-antd)
