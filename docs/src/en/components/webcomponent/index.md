# Web Component package

`@opentiny/genui-sdk-webcomponent` ships a ready-to-use custom element, `<genui-config-renderer>`, with the OpenTiny Vue materials already bundled. Rendering, theme switching and i18n are all handled by this single tag. The output is a self-contained ES module — no Vue runtime and no build step required.

The package exports exactly one value, `GenuiConfigRendererElement`, and registers the tag on import.

To use your own materials, or to build a React / Angular element, see [Web Component CLI](./cli.md).

## Direct usage

```html
<script type="module" src="https://unpkg.com/@opentiny/genui-sdk-webcomponent/dist/genui-config-renderer.js"></script>

<genui-config-renderer
  content='{"componentName":"Page","children":[{"componentName":"TinyButton","props":{"text":"Hello"}}]}'
></genui-config-renderer>
```

Import it inside a bundler and the tag is registered automatically:

```ts
import '@opentiny/genui-sdk-webcomponent';
```

::: tip
The output is a native ES module, so opening it over `file://` is blocked by module CORS rules. Serve it with any static server, e.g. `npx http-server .`.
:::

## Attributes

Except for `id`, which is a plain attribute, every property works both as an attribute (string) and as a property (object / boolean). Assigning the property lets you pass objects directly without serializing JSON.

| Property                            | Type                       | Default | Description                                                                            |
| ----------------------------------- | -------------------------- | ------- | -------------------------------------------------------------------------------------- |
| `theme`                             | `string`                   | `light` | `light` / `dark` / `lite` (provided by the OpenTiny Vue materials) / `auto` (follows the system) |
| `locale`                            | `string`                   | `zh_CN` | e.g. `zh_CN`, `en_US`                                                                  |
| `i18n`                              | JSON string \| object      | —       | Extra messages                                                                         |
| `id`                                | `string`                   | —       | Native id of the host element; it stays on the element and is never forwarded inward    |
| `content`                           | JSON string \| object      | `{}`    | Schema to render                                                                       |
| `generating`                        | boolean                    | `false` | Whether output is streaming                                                            |
| `is-json-complete`                  | boolean                    | `false` | Whether the schema has been fully received                                             |
| `custom-components`                 | JSON string \| object      | —       | Additional components merged into the materials                                        |
| `custom-actions`                    | object                     | `{}`    | Custom actions; values are objects with `execute`, property-only                       |
| `required-complete-field-selectors` | JSON string \| string[]    | —       | Field selectors that need buffering                                                    |
| `state`                             | JSON string \| object      | —       | Initial state                                                                          |

Boolean attributes follow HTML conventions: `generating="false"` is `false`, any other non-empty value (including a bare `generating`) is `true`.

**Materials are baked in at build time; the element has no `materials` property.** Use the CLI to rebuild with different materials.

```js
const el = document.querySelector('genui-config-renderer');
el.content = { componentName: 'Page', children: [] };
el.generating = true;
```

## Theme and i18n

```html
<genui-config-renderer id="a" theme="dark" locale="zh_CN"></genui-config-renderer>
<genui-config-renderer id="b" theme="light" locale="en_US"></genui-config-renderer>
```

```js
document.querySelector('#a').theme = 'auto'; // follow the system
```

- `theme` is **isolated per element**. The materials' `themeFactory` wraps the content in a scoped theme root and injects the theme CSS, so elements with different themes can coexist on one page.
- `locale` is **not isolated**. i18n is a module-level singleton of the whole bundle, and each element's inner `GenuiConfigProvider` writes its own `locale` back into it. An element without an explicit `locale` therefore overwrites the global `zh_CN` and affects elements created later; messages are resolved when the element is created, so changing `locale` requires recreating the element. **Always set `locale` explicitly.**

## Imperative creation

```js
import { GenuiConfigRendererElement } from '@opentiny/genui-sdk-webcomponent';

const el = new GenuiConfigRendererElement();
el.theme = 'dark';
el.content = { componentName: 'Page', children: [] };
document.body.appendChild(el);
```

## Exports

| Export                       | Description               |
| ---------------------------- | ------------------------- |
| `GenuiConfigRendererElement` | Element constructor       |

To change materials or the tag name, or to build a React / Angular element, use the [Web Component CLI](./cli.md).
