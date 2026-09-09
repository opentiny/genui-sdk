# generateCode

`generateCode` turns SchemaJSON into a Vue SFC (`<template>` + `<script setup>` + `<style>`). Use it to export page source, preview offline, or continue development from generated code.

When you only need code generation, import from `@opentiny/genui-sdk-vue/code-generator`. See [Quick Start - Subpath Imports](../guide/quick-start#subpath-imports). The main entry `@opentiny/genui-sdk-vue` also re-exports this API.

## Basic Usage

```ts
import { generateCode } from '@opentiny/genui-sdk-vue/code-generator';

const { panelName, panelValue, errors } = await generateCode({
  pageInfo: {
    name: 'OrderForm',
    schema: {
      componentName: 'Page',
      children: [
        {
          componentName: 'TinyButton',
          props: { text: 'Submit', type: 'primary' },
        },
      ],
    },
  },
  componentsMap: [
    {
      componentName: 'TinyButton',
      package: '@opentiny/vue',
      exportName: 'TinyButton',
    },
  ],
  formatWithPrettier: true,
});

if (errors.length) {
  console.error(errors);
}

console.log(panelName); // OrderForm.vue
console.log(panelValue); // Vue SFC source
```

`schema` can be an object or a JSON string. Invalid or empty input falls back to an empty `Page`.

## generateCode()

- **Type**

```ts
function generateCode(params: ICodeGeneratorParams): Promise<ICodeGeneratorResult>
```

This is equivalent to `new VueCodeGenerator().generate(params)`. Compile validation is on by default.

- **Parameters**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `pageInfo.schema` | `CardSchema \| string` | Yes | — | Page schema |
| `pageInfo.name` | `string` | No | `'SchemaCard'` | Output file name without extension; result is `{name}.vue` |
| `componentsMap` | `IComponentMapItem[]` | No | `[]` | Maps schema component names to npm packages for generated `import`s |
| `formatWithPrettier` | `boolean` | No | `false` | Format with Prettier; returns unformatted source if formatting fails |

- **Returns**: `Promise<ICodeGeneratorResult>`

## ICodeGeneratorResult

| Field | Type | Description |
|-------|------|-------------|
| `panelName` | `string` | File name, e.g. `SchemaCard.vue` |
| `panelValue` | `string` | Vue SFC source |
| `panelType` | `'vue'` | Always Vue |
| `type` | `'page'` | Always a page |
| `prettierOpts` | `Record<string, unknown>` | Prettier options used for this run |
| `errors` | `{ message: string }[]` | Compile-validation errors; empty when none |

## IComponentMapItem

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `componentName` | `string` | Yes | Component name in the schema; must match `componentName` |
| `package` | `string` | Yes | npm package name for `from '...'` |
| `exportName` | `string` | No | Export from the package; if it differs from `componentName`, generates `exportName as componentName` |

Items missing `componentName` or `package` are ignored. Components present in the schema but absent from `componentsMap` do not get an import.

You can build the map from materials protocol `npm` fields, for example:

```ts
import { materialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';

const componentsMap = materialsMeta.materials.flatMap((material) =>
  (material.data?.materials?.components ?? []).map((item) => ({
    componentName: item.component,
    package: item.npm.package,
    exportName: item.npm.exportName,
  })),
);
```

## VueCodeGenerator

Instantiate the generator when you need custom Prettier options or want to disable compile validation:

```ts
import { VueCodeGenerator } from '@opentiny/genui-sdk-vue/code-generator';

const generator = new VueCodeGenerator({
  prettierOpts: { printWidth: 100, singleQuote: true },
  enableCompileValidation: false,
});

const result = await generator.generate({
  pageInfo: { schema },
  formatWithPrettier: true,
});
```

### Constructor options `IVueCodeGeneratorOptions`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `prettierOpts` | `Record<string, unknown>` | Built-in Vue defaults | Merged with built-in options for formatting |
| `enableCompileValidation` | `boolean` | `true` | Validate output with `@vue/compiler-sfc` |

## Generated Output

The SFC preserves schema semantics as much as possible:

- `<template>` from the component tree
- `<script setup>` from `state`, `methods`, `lifeCycles`, and `refs`
- `<style>` from schema `css`
- component imports from `componentsMap`

Playground “Export Vue source” uses this API.
