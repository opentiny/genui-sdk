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

* Architecture notes: [docs/REACT_RENDERER.md](./docs/REACT_RENDERER.md)
* Materials: [@opentiny/genui-sdk-materials-react-antd](../../materials/react-antd/)
