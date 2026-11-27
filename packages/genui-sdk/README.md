# @opentiny/genui-sdk

The umbrella package of [OpenTiny GenUI SDK](https://opentiny.design/genui-sdk). Install one package and import any GenUI SDK package from its subpath.

## Usage

```bash
pnpm add @opentiny/genui-sdk
```

```ts
// Vue
import { GenuiChat, GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk/vue';

// React
import { GenuiRenderer } from '@opentiny/genui-sdk/react';

// Angular
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk/angular';

// Materials
import { materials } from '@opentiny/genui-sdk/materials-vue-opentiny-vue';

// Framework agnostic
import { genPrompt, repairJson } from '@opentiny/genui-sdk/core';
import { equipChatCompletions } from '@opentiny/genui-sdk/server';
```

`@opentiny/genui-sdk/<name>` is nothing but `export * from '@opentiny/genui-sdk-<name>'`, so the documentation of the original package applies unchanged.

## Subpaths

| Subpath                                             | Re-exports                                          |
| --------------------------------------------------- | --------------------------------------------------- |
| `@opentiny/genui-sdk/core`                          | `@opentiny/genui-sdk-core`                          |
| `@opentiny/genui-sdk/server`                        | `@opentiny/genui-sdk-server`                        |
| `@opentiny/genui-sdk/vue`                           | `@opentiny/genui-sdk-vue`                           |
| `@opentiny/genui-sdk/react`                         | `@opentiny/genui-sdk-react`                         |
| `@opentiny/genui-sdk/angular`                       | `@opentiny/genui-sdk-angular`                       |
| `@opentiny/genui-sdk/materials-vue-opentiny-vue`    | `@opentiny/genui-sdk-materials-vue-opentiny-vue`    |
| `@opentiny/genui-sdk/materials-vue-element-plus`    | `@opentiny/genui-sdk-materials-vue-element-plus`    |
| `@opentiny/genui-sdk/materials-angular-opentiny-ng` | `@opentiny/genui-sdk-materials-angular-opentiny-ng` |
| `@opentiny/genui-sdk/materials-react-antd`          | `@opentiny/genui-sdk-materials-react-antd`          |
| `@opentiny/genui-sdk/skill-generator`               | `@opentiny/genui-sdk-skill-generator`               |

## Notes

- There is no root import. `import '@opentiny/genui-sdk'` is not supported; always use a subpath.
- The package depends on every package listed above, including all three frontend frameworks and all materials packages. An application that only uses one framework should install that framework's packages directly to keep `node_modules` small.
- The CLI binaries `genui-sdk-server` and `genui-skill-generate` are provided by the sub-packages and are linked into `node_modules/.bin` as usual.
- `@opentiny/genui-sdk-integration-skill` is installed as a dependency but has no subpath, because it is a documentation-only agent skill without a JavaScript entry.
- Subpath exports require a resolver that understands the `exports` field (Node.js ≥ 12.7, Vite, webpack ≥ 5, TypeScript with `moduleResolution` set to `bundler`, `node16` or `nodenext`).

## Documentation

- [Quick start](https://docs.opentiny.design/genui-sdk/guide/quick-start)
- [Server usage](https://docs.opentiny.design/genui-sdk/guide/server-usage)
- [Core API](https://docs.opentiny.design/genui-sdk/components/core/api)

## Maintaining the package

There is no build step. Each subpath is a hand-written file pair committed in the repository, for example [vue/index.js](./vue/index.js) and [vue/index.d.ts](./vue/index.d.ts), both containing exactly one line:

```js
export * from '@opentiny/genui-sdk-vue';
```

To add a sub-package, copy that pair into `<name>/` with the right package name, then add `./<name>` to `exports` and `<name>` to `files` and `dependencies` in [package.json](./package.json). To remove one, delete the directory and those three entries.

The package is published together with the other packages by `.github/workflows/publish-packages.yml` (published last, after all of its dependencies), or on its own by `.github/workflows/publish-package.yml`.
