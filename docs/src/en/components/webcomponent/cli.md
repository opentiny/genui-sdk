# Web Component CLI

`genui-sdk-build-webcomponent` bundles the renderer together with the materials library you point it at and emits a custom element. One command covers Vue, React and Angular (`-F` selects the framework). It runs the same runtime code as the default `@opentiny/genui-sdk-webcomponent` package — only the framework and materials differ.

Use it when you already have your own materials library (see [Custom Materials](../examples/custom-materials)) and want an element that a plain `<script type="module">` can load.

## Running

```bash
npx genui-sdk-build-webcomponent --materials ./my-materials
```

As a project build script:

::: tabs
== npm

```bash
npm install -D @opentiny/genui-sdk-build-webcomponent
npx genui-sdk-build-webcomponent -m @scope/my-materials
```

== pnpm

```bash
pnpm add -D @opentiny/genui-sdk-build-webcomponent
pnpm exec genui-sdk-build-webcomponent -m @scope/my-materials
```

== yarn

```bash
yarn add -D @opentiny/genui-sdk-build-webcomponent
yarn genui-sdk-build-webcomponent -m @scope/my-materials
```

:::

The `vite` and framework plugins the CLI needs are installed with `@opentiny/genui-sdk-build-webcomponent`; no extra build config is required. The GenUI runtimes (`@opentiny/genui-sdk-vue` / `-react` / `-angular`) are dependencies of the CLI, installed with it and pinned by its version, so **you never install or pick them yourself**; only the framework itself (`vue` / `react` / `@angular/core` with `zone.js`) comes from your project, which keeps a single runtime instance.

## Options

| Option                     | Description                                                                    |
| -------------------------- | ------------------------------------------------------------------------------ |
| `-F, --framework <name>`   | Target framework: `vue` / `react` / `angular`, defaults to `vue`               |
| `-m, --materials <source>` | Materials source; repeatable or comma separated, merged into one bundle        |
| `-t, --tag <name>`         | Custom element tag name, default `genui-config-renderer`                       |
| `-o, --out-dir <dir>`      | Output directory, default `dist/web-component`, relative to the cwd            |
| `-f, --file-name <name>`   | Output file name without extension, default `genui-config-renderer`            |
| `--minify` / `--no-minify` | Enable / disable minification (enabled by default)                             |
| `--sourcemap`              | Emit source maps                                                               |
| `-h, --help`               | Show help                                                                      |
| `-v, --version`            | Show version                                                                   |

```bash
# Vue (default)
genui-sdk-build-webcomponent -m @scope/materials-a -m ./materials-b -t my-genui -o dist/wc

# React
genui-sdk-build-webcomponent -F react -m @scope/react-materials

# Angular
genui-sdk-build-webcomponent -F angular -m @scope/ng-materials
```

## Framework differences

| Framework | Materials requirement                                    | Registration | You provide                                        |
| --------- | -------------------------------------------------------- | ------------ | -------------------------------------------------- |
| `vue`     | Vue components (a `materials` object)                    | synchronous  | `vue`; the GenUI runtime ships with the CLI         |
| `react`   | React components (a `materials` object)                  | synchronous  | `react` / `react-dom`; the GenUI runtime ships with the CLI |
| `angular` | Angular `standalone` components (a `materials` object)   | **async**    | `@angular/core` and `zone.js`; the GenUI runtime ships with the CLI |

Angular's `customElements.define` needs a fully initialized injector, so `GenuiConfigRendererElement` is a `Promise<CustomElementConstructor>`. The browser upgrades elements already on the page once registration completes, so nothing extra is needed:

```js
import { GenuiConfigRendererElement } from './dist/web-component/genui-config-renderer.js';

await GenuiConfigRendererElement;
const el = document.createElement('genui-config-renderer');
document.body.appendChild(el);
```

## Materials source

A materials module must export a `materials` object (`IMaterials`):

```ts
// my-materials/materials.ts
export const materials = {
  components: {/* component map */},
  actions: {/* built-in actions */},
};
```

`-m` accepts four forms:

| Form                       | Resolution                                                                                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@scope/my-materials`      | npm package; uses its `/materials` subpath when present, otherwise the `import` / `module` / `main` entry                                                      |
| `@scope/my-materials/sub`  | Explicit subpath inside the package                                                                                                                            |
| `./my-materials`           | Local directory: prefers `exports["./materials"]` in its `package.json`, then the package entry (`import` / `module` / `main`), then `dist/materials.js`, `dist/index.js`, `src/materials/index.ts`, `src/index.ts`, `index.js` |
| `./src/materials/index.ts` | Local file, used directly                                                                                                                                      |

Package names are resolved from the working directory upwards, so running inside a monorepo sub-package works as expected.

## Output

```text
dist/web-component/
├─ genui-config-renderer.js    self-contained ES module, no external imports
└─ genui-config-renderer.d.ts  matching type declarations
```

The bundle registers `<genui-config-renderer>` by default and exports `GenuiConfigRendererElement`, `GENUI_CONFIG_RENDERER_TAG`, `registerGenuiConfigRenderer`, `materials` and `materialKey`. Vue / React additionally export `createGenuiConfigRendererElement(materials?)`; Angular additionally exports `defineGenuiConfigRenderer(tagName?, materials?)`, and its `GenuiConfigRendererElement` is a `Promise<CustomElementConstructor>`.

Custom tag or file name:

```bash
genui-sdk-build-webcomponent -m ./my-materials -t my-genui -f my-genui
```

```html
<script type="module" src="./dist/web-component/my-genui.js"></script>
<my-genui content='{"componentName":"Page","children":[]}'></my-genui>
```

Attributes, theming and i18n work exactly like the default package, see [Web Component](./index.md).

## Build guarantees

- A single framework runtime per bundle: `vue` / `react` are resolved from your project and deduped, so a second reactive or hooks runtime cannot break updates.
- `process.env.NODE_ENV` is statically replaced, so loading from a browser never throws `process is not defined`.
- The build runs in the working directory, **does not read** your `vite.config`, and **does not clear** other files in the output directory.
- Unknown tags in Vue material templates are compiled as Vue components; if a material really needs a custom element, register it inside the material.

## Troubleshooting

| Symptom                                                        | Cause and fix                                                                          |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `物料路径不存在` / `无法在目录 … 中找到物料入口`                | Wrong `-m`, or the materials package does not export `materials`                        |
| `无法从 … 向上找到依赖 …`                                       | The materials package is not installed in the current project                           |
| `无法解析物料 "…"`                                             | Wrong package name, or the package is not installed in the current project              |
| `无法确定 … 的入口文件`                                         | The materials package has no usable `exports` / `module` / `main` entry                 |
| `无法解析 vue` / `无法解析 react`                               | Install the framework (`vue`, or `react` + `react-dom`) in the project you run the command in |
| `无法解析 @angular/core` / `无法解析 zone.js`                   | With `-F angular`, install Angular and `zone.js` in the project you run the command in  |
| Blank page with `Failed to resolve module specifier`            | The page was opened over `file://`; serve it with a static server                       |
| Material styles missing                                         | The materials package must import its own styles in its entry                            |
| Need the full stack trace                                       | Prefix the command with `GENUI_WC_DEBUG=1`                                             |
