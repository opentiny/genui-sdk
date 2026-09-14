# GenuiConfigProvider Component

`GenuiConfigProvider` injects component materials for `GenuiRenderer`.

When using only ConfigProvider, you can import it on demand from `@opentiny/genui-sdk-react/config-provider`. See [Install - Subpath Imports](../../guide/react/install#subpath-imports).

When used with `GenuiRenderer`, you typically need to inject component materials via the `materials` prop. See [Materials Configuration](../../guide/react/install#materials-configuration).

## Props

### materials

- **Type**: `IMaterials`
- **Required**: No (required when using `GenuiRenderer`)
- **Description**: Component materials for the renderer. Typically the `materials` object from `@opentiny/genui-sdk-materials-react-antd`.

```tsx
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-react';
import { materials } from '@opentiny/genui-sdk-materials-react-antd/materials';
import 'antd/dist/reset.css';

export function Example({ content }: { content: string }) {
  return (
    <GenuiConfigProvider materials={materials}>
      <GenuiRenderer content={content} />
    </GenuiConfigProvider>
  );
}
```

See [React Ant Design materials](../materials/react-antd) for materials exports.

## Children

`GenuiConfigProvider` wraps child components via `children`.

```tsx
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-react';
import { materials } from '@opentiny/genui-sdk-materials-react-antd/materials';

export function Example({ content }: { content: string }) {
  return (
    <GenuiConfigProvider materials={materials}>
      <GenuiRenderer content={content} />
    </GenuiConfigProvider>
  );
}
```
