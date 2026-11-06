# GenuiConfigProvider Component

`GenuiConfigProvider` injects component materials for `GenuiRenderer` and drives the materials theme and locale.

When using only ConfigProvider, you can import it on demand from `@opentiny/genui-sdk-react/config-provider`. See [Install - Subpath Imports](../../guide/react/install#subpath-imports).

When used with `GenuiRenderer`, you typically need to inject component materials via the `materials` prop. See [Materials Configuration](../../guide/react/install#materials-configuration).

## Props

### theme

- **Type**: `string`
- **Required**: No
- **Default**: `'light'`
- **Description**: Theme id, such as `light` / `dark`. ConfigProvider passes `theme`, `locale`, and the system color scheme to the materials `runtimeFactory`, then renders the `root` returned by `apply()` around `children`.

### locale

- **Type**: `string`
- **Required**: No
- **Default**: `'zh_CN'`
- **Description**: Locale id in `language_REGION` form, such as `zh_CN` or `en_US`. The materials `runtimeFactory.apply()` performs the actual switch.

```tsx
<GenuiConfigProvider materials={materials} theme="dark" locale="en_US">
  <GenuiRenderer content={content} />
</GenuiConfigProvider>
```

### materials

- **Type**: `IMaterials | MergedMaterials`
- **Required**: No (required when using `GenuiRenderer`)
- **Description**: Component materials for the renderer. Typically the `materials` object from `@opentiny/genui-sdk-materials-react-antd`; use `mergeMaterials` to combine multiple materials packages.

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

### notify

- **Type**: `NotifyHandler`
- **Required**: No
- **Default**: `undefined`
- **Description**: Custom notification handler for renderer errors. It is called when a schema `JSFunction` fails to parse or throws at runtime; when omitted, the built-in notification is used.

```ts
export type NotifyHandler = (options: {
  type?: 'success' | 'warning' | 'error' | 'info';
  title?: string;
  message?: string;
  duration?: number;
}) => void;
```

```tsx
<GenuiConfigProvider materials={materials} notify={(options) => console.log(options)}>
  <GenuiRenderer content={schema} />
</GenuiConfigProvider>
```


## Runtime root

`materials.runtimeFactory` can be a single factory or an array. ConfigProvider deduplicates factories by reference and nests the `root` returned by each `apply()` around `children`, in order:

- `root` must be a React component;
- Keep the root component reference stable, usually by creating it once in the factory closure; creating a new component on every `apply()` remounts the subtree;
- When `theme` / `locale` are omitted, the defaults `'light'` / `'zh_CN'` are used and `apply()` is always called;
- A system color-scheme change calls `apply()` again but does not recreate an unchanged root.

The root returned by the React Ant Design materials is Ant Design's `ConfigProvider`, covering both the theme algorithm and locale.

## Hooks

ConfigProvider also exports two hooks for reading its context:

```ts
function useGenuiMaterials(): IMaterials;
function useGenuiNotify(): NotifyHandler | undefined;
```

`useGenuiMaterials()` returns the injected materials; `useGenuiNotify()` returns the configured notify handler, or `undefined` when it is not configured.

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
