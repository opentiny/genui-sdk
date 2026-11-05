# @opentiny/genui-sdk-webcomponent

A ready-to-use GenUI custom element, `<genui-config-renderer>`, with Vue and the OpenTiny Vue materials baked in. Rendering, theming and i18n are all handled by this single tag.

- **Self-contained:** the bundle is a single ES module — no Vue runtime, no build step, no framework required.
- **Drop-in:** importing the package registers the tag automatically.
- **Single export:** only `GenuiConfigRendererElement` is exported, so there is nothing to wire up.

[Learn more about GenUI SDK](https://opentiny.design/genui-sdk).

## Usage

```bash
npm install @opentiny/genui-sdk-webcomponent
```

```ts
import '@opentiny/genui-sdk-webcomponent';

const el = document.querySelector('genui-config-renderer');
el.content = {
  componentName: 'Page',
  children: [{ componentName: 'TinyButton', props: { text: 'Hello' } }],
};
```

Or load it from a CDN without a bundler:

```html
<script type="module" src="https://unpkg.com/@opentiny/genui-sdk-webcomponent/dist/genui-config-renderer.js"></script>

<genui-config-renderer
  content='{"componentName":"Page","children":[{"componentName":"TinyButton","props":{"text":"Hello"}}]}'
></genui-config-renderer>
```

Every property works both as an attribute (string) and as a property (object / boolean). Materials are baked in at build time; the element has no `materials` property.

## Exports

| Export                       | Description         |
| ---------------------------- | ------------------- |
| `GenuiConfigRendererElement` | Element constructor |

## Building your own

To bundle your own materials, or to emit a React / Angular element, use [`@opentiny/genui-sdk-build-webcomponent`](../build-webcomponent):

```bash
npx genui-sdk-build-webcomponent -m ./my-materials
```

See the [Web Component docs](https://opentiny.design/genui-sdk/components/webcomponent/) for attributes, theming and i18n.
