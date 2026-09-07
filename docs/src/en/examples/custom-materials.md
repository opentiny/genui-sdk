# Custom Materials Library

Since `1.3.0`, the GenUI SDK has decoupled materials from the framework: framework packages (such as `@opentiny/genui-sdk-vue`) no longer bundle any component materials. Instead, they rely on standalone **Materials Packages** that provide both a runtime component map and prompt metadata, injected through `GenuiConfigProvider`.

To connect your own component library (or a private in-house library) to GenUI, all you need is to write a **materials package**. This guide walks you through building a minimal materials library based on [Naive UI](https://www.naiveui.com/), starting from first principles.

## Walkthrough: Build a Naive UI Materials Library from Scratch

### Goal: A Minimal Materials Library

To keep the example minimal, we pick only a few common **form components** from Naive UI, plus one wrapped icon component:

- Form components: `NInput` (input), `NSelect` (select), `NButton` (button)
- Form containers: `NForm` (form), `NFormItem` (form item)
- Card container: `NCard` (also the default wrapper component)
- Icons: a wrapped `NIconSvg` (see [Step 4: Add Icon Materials](#step-4-add-icon-materials)), with `SearchOutline` and `CheckmarkOutline` (from `@vicons/ionicons5`)

In the end, a publishable minimal materials library has only **5 core source files** (plus a few one-line entry files):

```text
src/
├── index.ts                    # Package entry: re-exports everything (optional, see "Materials Package Core Overview")
├── materials/
│   ├── index.ts                # materials subpath entry (one-line re-export)
│   ├── materials.ts            # Assembles IMaterials (component map + default value map)
│   └── components/
│       └── components.ts       # componentName → component list
└── meta/
    ├── index.ts                # meta subpath entry (one-line re-export)
    ├── meta.ts                 # Assembles IMaterialsMeta (protocol + whitelist)
    ├── white-list.ts           # componentName whitelist allowed for the LLM
    └── bundle.json             # Component protocol description (the LLM spec)
```

### Step 1: Initialize the Project

Create the package directory and initialize it:

```bash
mkdir genui-materials-naive-ui && cd genui-materials-naive-ui
npm init -y
```

Install dependencies:

```bash
npm install @opentiny/genui-sdk-core
npm install vue naive-ui @vicons/ionicons5
npm install -D typescript vite vite-plugin-dts @vitejs/plugin-vue
```

- `@opentiny/genui-sdk-core`: provides types (`IMaterials`, `IMaterialsMeta`) and utilities (`buildMaterialDefaultValueMap`); a runtime dependency.
- `vue`, `naive-ui`, `@vicons/ionicons5`: the component library itself.
- Build tooling (`vite`, `vite-plugin-dts`, `@vitejs/plugin-vue`): dev dependencies.

Also, `meta.ts` imports `bundle.json` with `with { type: 'json' }` (see [Step 3](#step-3-write-the-prompt-metadata-meta)), and TypeScript does not enable JSON module resolution by default, so add a `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

- `resolveJsonModule`: allows importing `bundle.json` via `with { type: 'json' }`.
- `module: "ESNext"` + `moduleResolution: "bundler"`: matches the ESM/Vite resolution used by the build; `vite-plugin-dts` also relies on it when generating declarations.
- `include: ["src/**/*"]`: makes type-checking and declaration generation cover the whole `src`.

::: tip Dependencies or peer dependencies?
If you want the materials package and the host app to share the same component library instance (avoiding duplicate bundling and style conflicts), put `vue` and `naive-ui` in `peerDependencies`, following the official materials packages. Putting them in `dependencies` also works, just heavier.
:::

### Step 2: Write the Component List (materials)

The component list is a `componentName → component` map. When the renderer sees a `componentName` in a Schema, it resolves the real component through this list:

```ts
// src/materials/components/components.ts
import type { Component } from 'vue';
import { NButton, NCard, NForm, NFormItem, NInput, NSelect } from 'naive-ui';

export interface IComponents {
  [key: string]: Component;
}

export const components: IComponents = {
  NButton,
  NCard,
  NForm,
  NFormItem,
  NInput,
  NSelect,
};
```

**One line per component is one material.** The key in the list (e.g. `NInput`) is the `componentName` in the Schema, and it must match the component name declared in `meta`.

Assemble the list into the `IMaterials` the renderer needs:

```ts
// src/materials/materials.ts
import { buildMaterialDefaultValueMap, type IMaterials } from '@opentiny/genui-sdk-core';
import { materialsMeta } from '../meta';
import { components } from './components';

const requiredCompleteFieldSelectors = [];

export { components };

export const materials: IMaterials = {
  components,
  requiredCompleteFieldSelectors,
  defaultPropsMap: buildMaterialDefaultValueMap(materialsMeta),
};
```

- `components`: the component list; the renderer resolves `componentName → component` through it.
- `defaultPropsMap`: generated automatically by `buildMaterialDefaultValueMap` from the `defaultValue` fields in `bundle.json`, so rendering stays stable even when streaming fields are incomplete.
- `requiredCompleteFieldSelectors`: **buffer fields**. Once declared, these fields only participate in rendering after they are complete, avoiding errors caused by incomplete fields during streaming (e.g. `[componentName=NSelect] > props > options`). See [Configuring Buffer Fields](./renderer/required-complete-field-selectors) for the syntax.

Finally, add the `materials` subpath entry:

```ts
// src/materials/index.ts
export * from './materials';
```

### Step 3: Write the Prompt Metadata (meta)

`meta` is the core part - it determines what the LLM can generate. The heart of it is `bundle.json`, a spec describing each component: "what it is called, what it is for, and what props it has". `genPrompt` describes this information to the LLM.

Using `NInput` as an example, the protocol description in `src/meta/bundle.json` looks like this:

```json
{
  "data": {
    "framework": "Vue",
    "materials": {
      "components": [
        {
          "name": { "zh_CN": "输入框" },
          "component": "NInput",
          "description": "通过鼠标或键盘输入字符",
          "npm": {
            "package": "naive-ui",
            "exportName": "NInput",
            "destructuring": true
          },
          "schema": {
            "properties": [
              {
                "name": "0",
                "label": { "zh_CN": "基础属性" },
                "content": [
                  {
                    "property": "modelValue",
                    "label": { "text": { "zh_CN": "绑定值" } },
                    "description": { "zh_CN": "绑定值" },
                    "required": true,
                    "type": "string",
                    "cols": 12
                  },
                  {
                    "property": "placeholder",
                    "label": { "text": { "zh_CN": "占位文本" } },
                    "description": { "zh_CN": "输入框占位文本" },
                    "required": false,
                    "type": "string",
                    "cols": 12
                  }
                ]
              }
            ],
            "events": {
              "onUpdate:modelValue": {
                "label": { "zh_CN": "绑定值改变时触发" },
                "description": { "zh_CN": "绑定值改变时触发" }
              }
            }
          }
        }
      ]
    }
  }
}
```

`bundle.json` directly shapes the schema the LLM generates, so it should be written accurately. Field meanings:

| Field | Meaning |
|-------|---------|
| `component` | the component name, matching the `componentName` at render time; **it must match the key in the component list** |
| `name` | the display name, used in the config panel and grouping |
| `description` | the component description, the main basis for LLM generation; **the more detailed, the more accurate** |
| `npm` | the source package info (package name, export name), used for code generation and on-demand imports |
| `schema.properties` | the property group descriptions that decide which props appear in the config panel; `property` is the prop name, `type` is the prop type, and `defaultValue` feeds the default value map |
| `schema.events` | component events, used by the LLM to bind event handlers |
| `schema.slots` | component slots, telling the LLM where to place child components |

Assemble `bundle.json` and the whitelist into `materialsMeta`:

```ts
// src/meta/white-list.ts
export const whiteList = [
  'NInput', 'NSelect', 'NButton', 'NForm', 'NFormItem', 'NCard',
  'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ol', 'ul', 'li', 'label', 'div', 'span',
  'Text',
];

// src/meta/meta.ts
import type { IMaterialsMeta, IMaterialsProtocol } from '@opentiny/genui-sdk-core';
import bundleJson from './bundle.json' with { type: 'json' };
import { whiteList } from './white-list';

export const materialsMeta: IMaterialsMeta = {
  materials: [bundleJson] as unknown as IMaterialsProtocol[],
  wrapperComponent: 'NCard',
  whiteList,
  examples: [],
  rules: [],
};
```

`IMaterialsMeta` fields:

- `materials`: the list of component protocol descriptions (from `bundle.json`).
- `whiteList`: the `componentName` whitelist allowed for the LLM (including native tags such as `a`, `h1`-`h6`, `p`, `div` and the built-in `Text`). **Only components registered in `bundle.json` that also appear in the whitelist are provided to the LLM by `genPrompt`.**
- `wrapperComponent`: the default wrapper component; `genPrompt` tells the LLM to wrap the root node with it when possible.
- `examples`: prompt example schemas, provided as needed; they help the LLM follow a proven pattern.
- `rules`: materials-side generation rules, add as needed.

Add the `meta` subpath entry:

```ts
// src/meta/index.ts
export * from './meta';
```

### Step 4: Add Icon Materials

Icon materials work exactly like regular components, with one extra step: **wrap an icon component** that maps the `name` prop to a concrete icon. This way icons can be selected by name in the config panel, and the LLM can easily generate icon-enabled buttons.

#### 1. Wrap an Icon Component

Create `src/materials/components/NIconSvg.vue` to look up the icon by `name` from `@vicons/ionicons5`:

```vue
<!-- src/materials/components/NIconSvg.vue -->
<script setup lang="ts">
import { computed, type Component } from 'vue';
import * as Icons from '@vicons/ionicons5';

const props = withDefaults(
  defineProps<{
    name: string;
  }>(),
  { name: '' },
);

const iconComponent = computed(() => {
  return (Icons as Record<string, Component | unknown>)[props.name] || null;
});
</script>

<template>
  <component :is="iconComponent" v-if="iconComponent" />
</template>
```

#### 2. Register It in the Component Registry

```ts
// src/materials/components/components.ts
import NIconSvg from './NIconSvg.vue';

export const components: IComponents = {
  NButton,
  NCard,
  NForm,
  NFormItem,
  NIconSvg,
  NInput,
  NSelect,
};
```

#### 3. Describe It in `bundle.json`

An icon component is just a regular component with a single `name` prop. Use `SelectIconConfigurator` so the icon can be picked directly in the config panel:

```json
{
  "name": { "zh_CN": "图标" },
  "component": "NIconSvg",
  "description": "图标组件，name 为图标名，例如 SearchOutline、CheckmarkOutline",
  "schema": {
    "properties": [
      {
        "name": "0",
        "label": { "zh_CN": "基础属性" },
        "content": [
          {
            "property": "name",
            "label": { "text": { "zh_CN": "图标名称" } },
            "description": { "zh_CN": "图标名称，例如 SearchOutline（搜索）、CheckmarkOutline（对勾）" },
            "required": true,
            "type": "string",
            "cols": 12,
            "widget": { "component": "SelectIconConfigurator", "props": {} }
          }
        ]
      }
    ]
  }
}
```

#### 4. Add It to the Whitelist

```ts
// src/meta/white-list.ts
export const whiteList = [
  'NInput', 'NSelect', 'NButton', 'NForm', 'NFormItem', 'NCard', 'NIconSvg',
  'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ol', 'ul', 'li', 'label', 'div', 'span',
  'Text',
];
```

Now the LLM can easily generate icon-enabled buttons, e.g. placing an `NIconSvg` in the `icon` slot of `NButton`.

### Step 5: Expose npm Subpaths

`materials` and `meta` are consumed by different ends (frontend renderer / server-side `genPrompt`), so they should be declared as separate subpaths through the `exports` field in `package.json`. This enables on-demand imports (avoiding pulling in the artifact you do not use), and lets type definitions (`.d.ts`) follow their own entries for better precision.

```json
{
  "name": "genui-materials-naive-ui",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".":          { "types": "./dist/index.d.ts",  "import": "./dist/index.js" },
    "./materials":{ "types": "./dist/materials.d.ts", "import": "./dist/materials.js" },
    "./meta":     { "types": "./dist/meta.d.ts",   "import": "./dist/meta.js" }
  },
  "scripts": {
    "build": "vite build"
  }
}
```

Export conventions for each entry:

| Subpath | Exports | Type |
|---------|---------|------|
| `package-name` | both `materials` and `materialsMeta` | [`IMaterials`](#the-two-core-types) / [`IMaterialsMeta`](#the-two-core-types) |
| `package-name/materials` | the `materials` object (with `components`, `requiredCompleteFieldSelectors`, `defaultPropsMap`) | `IMaterials` |
| `package-name/meta` | the `materialsMeta` object | `IMaterialsMeta` |

> `materials` and `meta` serve different consumers. Building them as separate entries lets the host app and the server import whichever subpath they need.

### Step 6: Configure the Vite Build

Use Vite library mode to build `index`, `materials`, and `meta` as separate entries, keeping dependencies and peer dependencies (`vue`, `naive-ui`, etc.) external:

```ts
// vite.config.ts
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import vue from '@vitejs/plugin-vue';
import packageJson from './package.json' with { type: 'json' };

const pkgRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [vue(), dts({ rollupTypes: true })],
  build: {
    lib: {
      entry: {
        index: join(pkgRoot, 'src/index.ts'),
        materials: join(pkgRoot, 'src/materials/index.ts'),
        meta: join(pkgRoot, 'src/meta/index.ts'),
      },
      formats: ['es'],
      fileName: (_, entryName) => `${entryName}.js`,
    },
    sourcemap: true,
    rollupOptions: {
      external: [
        ...Object.keys(packageJson.dependencies || {}),
        ...Object.keys(packageJson.peerDependencies || {}),
      ],
    },
  },
});
```

A few notes:

- `dts({ rollupTypes: true })`: merges each entry's declarations into a single flat file (`dist/index.d.ts`, `dist/materials.d.ts`, `dist/meta.d.ts`), matching the `types` paths declared in the `exports` of [Step 5](#step-5-expose-npm-subpaths). Without it, `vite-plugin-dts` preserves the `src` directory structure and emits `dist/materials/index.d.ts`-style nested paths, which would not match `exports`.
- `pkgRoot = fileURLToPath(new URL('.', import.meta.url))`: the package declares `"type": "module"`, so `vite.config.ts` runs with ESM semantics where `__dirname` does not exist; this one line equivalently captures the current directory (the ESM equivalent of `__dirname`), and the entry paths are joined from it with `join(pkgRoot, ...)`.
- `external` reads both `dependencies` and `peerDependencies`: since `vue` and `naive-ui` live in `peerDependencies` (provided by the host app), leaving them out of `external` would bundle them, so host and package end up with separate component instances.

### Step 7: Publish to npm

```bash
npm run build
npm publish --access public
```

After publishing, your materials package can be used just like the official ones.

## Using Your Custom Materials Library in an App

Install dependencies:

```bash
npm install genui-materials-naive-ui naive-ui
```

Frontend rendering: inject `materials` via `GenuiConfigProvider` so the renderer can resolve components by `componentName`.

```vue
<script setup lang="ts">
import { GenuiChat, GenuiConfigProvider } from '@opentiny/genui-sdk-vue';
import { materials } from 'genui-materials-naive-ui/materials';
</script>

<template>
  <GenuiConfigProvider :materials="materials">
    <GenuiChat />
  </GenuiConfigProvider>
</template>
```

Server-side prompt generation: use `genPrompt` to fold `materialsMeta` into the system prompt so the LLM generates schemas that conform to the materials protocol.

```ts
import { genPrompt } from '@opentiny/genui-sdk-core';
import { materialsMeta } from 'genui-materials-naive-ui/meta';

const systemPrompt = genPrompt('Vue', materialsMeta);
```

## Materials Package Core Overview

A materials package is essentially an **npm package**. It contains two core artifacts:

- **Component spec**: the LLM needs to know "which components exist, what props each has, and how to use them" to generate a protocol-compliant Schema.
- **Component list**: once a Schema comes back from the LLM, `componentName` must be mapped to a real component for rendering.

Therefore, a materials package exposes only two artifacts:

| Artifact | Subpath | Purpose | Consumer |
|----------|---------|---------|----------|
| `materials` | `your-package/materials` | Component list: `componentName → component` | Frontend renderer (injected via `GenuiConfigProvider`) |
| `meta` | `your-package/meta` | Prompt metadata: `IMaterialsMeta` | Server-side `genPrompt` (folded into the System Prompt) |

The data relationship between the two: the `bundle.json` in `meta` (the component spec) drives the default value map in `materials`, and `genPrompt` then describes `meta` to the LLM. `meta` tells the LLM how to generate, `materials` is executed by the renderer, and the two align through `componentName`.

### Directory Structure: Not Enforced

**There are no mandatory directory-structure requirements.** The layout in the walkthrough is only a recommended way to organize things. Only two things decide whether a package is a valid materials package:

1. `package.json`'s `exports` correctly exposes the `materials` and `meta` subpaths (see [Step 5: Expose npm Subpaths](#step-5-expose-npm-subpaths));
2. The objects exported from the `materials` and `meta` entries satisfy the type contracts expected by the renderer and `genPrompt`.

### The Two Core Types

The whole "contract" of a materials package is expressed in two types, both defined in `@opentiny/genui-sdk-core`:

```typescript
// Rendering side: component list + buffer fields + default value map
interface IMaterials {
  components?: Record<string, unknown>;      // component name → runtime component
  requiredCompleteFieldSelectors?: string[]; // buffer field selectors
  defaultPropsMap?: Record<string, any>;     // component default props map
  [key: string]: any;                        // allows extra fields
}

// Generation side: materials protocol + whitelist + examples
interface IMaterialsMeta {
  materials: IMaterialsProtocol[];           // materials protocol data (bundle.json)
  examples: IExample[];                      // prompt example schemas
  whiteList: string[];                       // component names allowed for the LLM
  wrapperComponent?: string;                 // default wrapper component
  rules?: string[];                          // materials-side generation rules
}
```

What each one does:

- **`IMaterials`**: consumed by the frontend renderer (injected via `GenuiConfigProvider`). When the renderer sees a `componentName` in a Schema, it looks up the corresponding Vue component in `components` to render it; `defaultPropsMap` fills in props that have not been generated yet during streaming; `requiredCompleteFieldSelectors` declares buffer fields that must be complete before rendering.
- **`IMaterialsMeta`**: consumed by the server-side `genPrompt`. `genPrompt` folds `materials` (the component protocols from `bundle.json`) and `whiteList` into the System Prompt, telling the LLM to use only the whitelisted components and to generate schemas following the component protocols.

The two types align through **`componentName`**: the keys of `IMaterials.components` are the `componentName` values in the Schema, and they must match the `component` field of each component in `IMaterialsMeta` one-to-one.

### The Protocol Type of `bundle.json`

`IMaterialsMeta.materials` is an `IMaterialsProtocol[]`, and **one `bundle.json` is one `IMaterialsProtocol`**. It looks like this:

```typescript
interface IMaterialsProtocol {
  data: {
    framework: string;                       // 'Vue' | 'React' | 'Angular' | ...
    materials: {
      components?: IComponent[];             // component protocol descriptions
      packages?: IPackage[];
      snippets?: Array<ISnippetGroup | ISnippet>;
    };
  };
}
```

`IComponent` is the full description of a single component - i.e. the structure of "each component" in `bundle.json`:

```typescript
interface IComponent {
  name?: II18nText;                          // display name, e.g. { zh_CN: '输入框' }
  component?: string;                        // component name, the componentName at render time
  description?: string;                      // component description (basis for LLM generation)
  npm?: INpmConfig;                          // source package info
  schema?: IComponentSchema;                 // props, events, and slots
}

interface IComponentSchema {
  properties?: IPropertyGroup[];             // property groups
  events?: Record<string, IEventConfig>;     // events
  slots?: Record<string, ISlotConfig>;       // slots
}
```

You do not need to memorize all these types - **the JSON structure of `bundle.json` maps one-to-one to `IComponent`**. Just write the JSON following the [example in Step 3](#step-3-write-the-prompt-metadata-meta); the types are only a formal description of it. See the [Core API](../../components/core/api) for the full definitions.

## Going Further: Helping the LLM Understand Your Materials

- **Fill in `description`**: the more detailed the component and prop descriptions, the more accurate the LLM output. This is the highest-ROI optimization.
- **Provide `examples`**: give 1-2 typical schemas (e.g., a form example) in `materialsMeta.examples`; the LLM will model its output on them.
- **Configure buffer fields**: to avoid render errors caused by incomplete fields during streaming, declare critical field paths in `materials.requiredCompleteFieldSelectors` (e.g., `[componentName=NSelect] > props > options`).

## Summary

Materials decoupling fully opens up the GenUI component ecosystem. Applying this guide to any component library takes only three steps:

1. Write the `components` component map (`IMaterials`);
2. Write `bundle.json` + `whiteList` and assemble them into `materialsMeta` (`IMaterialsMeta`);
3. Expose `materials` and `meta` as two subpaths via `exports`, then publish as an npm package.

Whether it is Element Plus, Ant Design, or a private in-house component library, you can connect it to generative UI this way.
