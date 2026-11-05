# Web Component CLI

`genui-sdk-vue-build` bundles the renderer together with the Vue materials library you point it at and emits a custom element. It runs the same runtime code as the built-in `<genui-config-renderer>` — only the materials differ.

Use it when you already have your own materials library (see [Custom Materials](../examples/custom-materials)) and want an element that a plain `<script type="module">` can load.

## Running it

```bash
npx genui-sdk-vue-build --materials ./my-materials
```

Install it in your project and use it as a build script:

::: tabs
== npm

```bash
npm install -D @opentiny/genui-sdk-vue
npx genui-sdk-vue-build -m @scope/my-materials
```

== pnpm

```bash
pnpm add -D @opentiny/genui-sdk-vue
pnpm exec genui-sdk-vue-build -m @scope/my-materials
```

== yarn

```bash
yarn add -D @opentiny/genui-sdk-vue
yarn genui-sdk-vue-build -m @scope/my-materials
```

:::

The CLI and the tooling it uses (`vite`, `@vitejs/plugin-vue`, `vite-plugin-css-injected-by-js`) are installed together with `@opentiny/genui-sdk-vue`, so there is no extra build configuration.

## Options

| Option                     | Description                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| `-m, --materials <source>` | Materials source. Repeatable, or comma-separated; multiple sources are merged into one output     |
| `-t, --tag <name>`         | Custom element tag name, defaults to `genui-config-renderer`                                      |
| `-o, --out-dir <dir>`      | Output directory, defaults to `dist/web-component`, relative to the directory the command runs in |
| `-f, --file-name <name>`   | Output file name without extension, defaults to `genui-config-renderer`                           |
| `--no-minify`              | Disable minification                                                                              |
| `--sourcemap`              | Emit source maps                                                                                  |
| `-h, --help`               | Show help                                                                                         |
| `-v, --version`            | Show version                                                                                      |

```bash
genui-sdk-vue-build -m @scope/materials-a -m ./materials-b -t my-genui -o dist/wc
```

## Materials sources

A materials module must export a `materials` object (`IMaterials`):

```ts
// my-materials/materials.ts
export const materials = {
  components: {/* component list */},
  actions: {/* built-in actions */},
};
```

`-m` accepts four forms:

| Form                       | Resolution                                                                                                                                                      |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@scope/my-materials`      | npm package name; the package's `/materials` subpath is used by default, falling back to `import` / `module` / `main` from its manifest                         |
| `@scope/my-materials/sub`  | An explicit subpath inside the package                                                                                                                          |
| `./my-materials`           | Local directory; `exports["./materials"]` from its `package.json` is used first, then `dist/materials.js`, `src/materials/index.ts`, `src/index.ts`, `index.js` |
| `./src/materials/index.ts` | Local file, used as is                                                                                                                                          |

Package names are resolved by walking `node_modules` upwards from the directory you run the command in, so it also works from a sub-package in a monorepo.

## Output

```text
dist/web-component/
├─ genui-config-renderer.js    self-contained ES module, no external dependencies
└─ genui-config-renderer.d.ts  matching type declarations
```

The bundle registers `<genui-config-renderer>` automatically and exports `GenuiConfigRendererElement`, `GENUI_CONFIG_RENDERER_TAG`, `registerGenuiConfigRenderer`, `materials` and `materialKey`.

After changing the tag or file name, just reference the new file:

```bash
genui-sdk-vue-build -m ./my-materials -t my-genui -f my-genui
```

```html
<script type="module" src="./dist/web-component/my-genui.js"></script>
<my-genui content='{"componentName":"Page","children":[]}'></my-genui>
```

Attributes, theme and i18n work exactly like the built-in element; see [Web Component](./web-component).

## Build conventions

- A single Vue instance in the output: the CLI aliases `vue` to the copy shipped with `@opentiny/genui-sdk-vue` and dedupes it, otherwise two reactivity systems would prevent components from updating.
- `process.env.NODE_ENV` is replaced at build time, so loading the bundle directly in a browser never throws `process is not defined`.
- The build runs in the directory you execute the command from, **never reads** your `vite.config`, and **never empties** the output directory.
- Custom elements used inside materials templates are left alone instead of being compiled as unregistered Vue components.

## Troubleshooting

| Symptom                                                         | Cause and fix                                                                                             |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `物料路径不存在` / `无法在目录 … 中找到物料入口`                | The `-m` value is wrong, or the materials package does not expose `materials`                             |
| `无法从 … 向上找到依赖 …`                                       | The materials package is not installed in the current project                                             |
| `未找到 dist/web-component-factory.js`                          | The installed `@opentiny/genui-sdk-vue` is too old; upgrade to a version with Web Component build support |
| Blank page, `Failed to resolve module specifier` in the console | The page was opened over `file://`; serve it with a static server                                         |
| Materials styles are missing                                    | The materials package must import its own styles from its entry                                           |
| You need a full stack trace                                     | Prefix the command with `GENUI_WC_DEBUG=1`                                                                |
