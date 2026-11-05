# Web Component

`@opentiny/genui-sdk-vue` ships a ready-to-use custom element, `<genui-config-renderer>`, with the OpenTiny Vue materials already bundled. Rendering, theme switching and i18n are all handled by this single tag. The output is a self-contained ES module — no Vue runtime and no build step required.

To build one from your own materials library, see [Web Component CLI](./web-component-cli).

## Direct usage

```html
<script
  type="module"
  src="https://unpkg.com/@opentiny/genui-sdk-vue/dist/web-component/genui-config-renderer.js"
></script>

<genui-config-renderer
  content='{"componentName":"Page","children":[{"componentName":"TinyButton","props":{"text":"Hello"}}]}'
></genui-config-renderer>
```

When you bundle it yourself, import it from the package subpath — importing registers the tag automatically:

```ts
import '@opentiny/genui-sdk-vue/web-component';
```

::: tip
The output is a native ES module. Opening the page over `file://` is blocked by module CORS rules, so serve it with any static server, for example `npx http-server .`.
:::

## Attributes

Every attribute is available both as an attribute (string) and as a property (object / boolean). Set properties when you want to pass objects without serialising them yourself.

| Attribute                           | Type                    | Default | Description                                                                       |
| ----------------------------------- | ----------------------- | ------- | --------------------------------------------------------------------------------- |
| `theme`                             | `string`                | `light` | `light` / `dark` / `lite` (OpenTiny Vue materials only) / `auto` (follows system) |
| `locale`                            | `string`                | `zh_CN` | e.g. `zh_CN`, `en_US`                                                             |
| `i18n`                              | JSON string \| object   | —       | Extra messages                                                                    |
| `id`                                | `string`                | —       | Native id of the host element, also used as the renderer's card id                |
| `content`                           | JSON string \| object   | `{}`    | The schema to render                                                              |
| `generating`                        | boolean                 | `false` | Whether output is still streaming                                                 |
| `is-json-complete`                  | boolean                 | `false` | Whether the schema has been received in full                                      |
| `custom-components`                 | JSON string \| object   | —       | Extra components merged into the materials                                        |
| `custom-actions`                    | object                  | `{}`    | Custom actions; values hold an `execute` function, so pass them as a property     |
| `required-complete-field-selectors` | JSON string \| string[] | —       | Field selectors that need buffering                                               |
| `state`                             | JSON string \| object   | —       | Initial state                                                                     |

Boolean attributes follow HTML conventions: `generating="false"` is `false`, any other non-empty value (including a bare `generating`) is `true`.

**Materials come from the build — the element has no `materials` property.** To use different materials, rebuild with the CLI.

```js
const el = document.querySelector('genui-config-renderer');
el.content = { componentName: 'Page', children: [] };
el.generating = true;
```

## Theme and locale

```html
<genui-config-renderer id="a" theme="dark" locale="zh_CN"></genui-config-renderer>
<genui-config-renderer id="b" theme="light" locale="en_US"></genui-config-renderer>
```

```js
document.querySelector('#a').theme = 'auto'; // follows the system
```

- `theme` **is isolated per element.** The materials' `themeFactory` wraps the content in a scoped theme root and injects the theme CSS, so elements with different themes can coexist on one page.
- `locale` **is not isolated.** i18n is a module-level singleton shared by the whole bundle, and each element's inner `GenuiConfigProvider` writes its own `locale` into it. An element without an explicit `locale` therefore pushes the default `zh_CN` globally and affects elements created afterwards. Messages are resolved when the element is created, so re-create the element after changing `locale`. **Always set `locale` explicitly.**

## Creating and registering imperatively

```js
import { GenuiConfigRendererElement, registerGenuiConfigRenderer } from '@opentiny/genui-sdk-vue/web-component';

const el = new GenuiConfigRendererElement();
el.theme = 'dark';
el.content = { componentName: 'Page', children: [] };
document.body.appendChild(el);

// Register under a different tag; skipped if it already exists
registerGenuiConfigRenderer('my-genui');
```

Importing `@opentiny/genui-sdk-vue/web-component` registers `<genui-config-renderer>` automatically. Use the manual call above if that tag is already taken on the page.

## Exports

| Export                                            | Description                                        |
| ------------------------------------------------- | -------------------------------------------------- |
| `GenuiConfigRendererElement`                      | The element constructor                            |
| `GENUI_CONFIG_RENDERER_TAG`                       | Default tag name, `'genui-config-renderer'`        |
| `registerGenuiConfigRenderer(tagName?, element?)` | Registers the tag, skipped when already defined    |
| `materials` / `materialKey`                       | Materials baked in at build time, plus their key   |
| `createGenuiConfigRendererElement(materials)`     | Exported from `./web-component-factory`, see below |

`@opentiny/genui-sdk-vue/web-component-factory` exports factories only, without materials. Materials are passed at call time, which makes it easy to wire the element into your own bundling setup:

```ts
import { createGenuiConfigRendererElement } from '@opentiny/genui-sdk-vue/web-component-factory';
import { materials } from '@scope/my-materials/materials';

customElements.define('my-genui', createGenuiConfigRendererElement(materials));
```

If you would rather not write the build config yourself, use the [Web Component CLI](./web-component-cli).
