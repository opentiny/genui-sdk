# @opentiny/genui-sdk-build-webcomponent

Bundles the GenUI renderer together with the materials library you point at it and emits a custom element. One command covers Vue, React and Angular — `genui-sdk-build-webcomponent`.

The build runs the same runtime code as [`@opentiny/genui-sdk-webcomponent`](../webcomponent); only the framework and the materials differ.

[Learn more about GenUI SDK](https://opentiny.design/genui-sdk).

## Usage

```bash
# Vue (default)
npx genui-sdk-build-webcomponent -m @opentiny/genui-sdk-materials-vue-opentiny-vue

# React
npx genui-sdk-build-webcomponent -F react -m @opentiny/genui-sdk-materials-react-antd

# Angular
npx genui-sdk-build-webcomponent -F angular -m @opentiny/genui-sdk-materials-angular-opentiny-ng
```

Or add it as a project dev dependency:

```bash
pnpm add -D @opentiny/genui-sdk-build-webcomponent
pnpm exec genui-sdk-build-webcomponent -m ./my-materials
```

`-m` accepts an npm package name, a package subpath, a local directory or a local file. Repeat it to merge several materials into one bundle.

The GenUI runtimes (`@opentiny/genui-sdk-vue` / `-react` / `-angular`) are dependencies of this package: they are installed with it and pinned by its version, so you never install or pick them yourself. Only the framework itself (`vue`, `react` / `react-dom`, or `@angular/core` with `zone.js`) is resolved from your project, which keeps a single runtime instance next to your materials.

## Options

| Option                     | Description                                                              |
| -------------------------- | ------------------------------------------------------------------------ |
| `-F, --framework <name>`   | `vue` / `react` / `angular`, defaults to `vue`                           |
| `-m, --materials <source>` | Materials source; repeatable or comma separated                          |
| `-t, --tag <name>`         | Custom element tag name, default `genui-config-renderer`                 |
| `-o, --out-dir <dir>`      | Output directory, default `dist/web-component`, relative to the cwd      |
| `-f, --file-name <name>`   | Output file name without extension, default `genui-config-renderer`      |
| `--no-minify`              | Disable minification                                                     |
| `--sourcemap`              | Emit source maps                                                         |
| `-h, --help`               | Show help                                                                |
| `-v, --version`            | Show version                                                             |

## Output

```text
dist/web-component/
├─ genui-config-renderer.js    self-contained ES module, no external imports
└─ genui-config-renderer.d.ts  matching type declarations
```

The bundle registers `<genui-config-renderer>` on load and exports `GenuiConfigRendererElement`, `GENUI_CONFIG_RENDERER_TAG`, `registerGenuiConfigRenderer`, `createGenuiConfigRendererElement`, `materials` and `materialKey`.

Angular registration is asynchronous: `GenuiConfigRendererElement` is a `Promise<CustomElementConstructor>`, and elements already in the page are upgraded once registration completes. Angular bundles also require `zone.js` and `@angular/core` to be installed in the project.

`Vue` and `React` bundles embed their framework runtime, so consumers need no extra runtime imports.

See the [Web Component CLI docs](https://opentiny.design/genui-sdk/components/webcomponent/cli) for the resolution rules, troubleshooting and the three-framework differences.
