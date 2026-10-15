# generateCode

React `generateCode` converts SchemaJSON into an editable, standalone React TSX component. The generated source uses material components, React state, event handlers, and JSX directly; it does not depend on `GenuiRenderer` at runtime.

When you only need code generation, import from `@opentiny/genui-sdk-react/code-generator`. The main entry `@opentiny/genui-sdk-react` also re-exports this API.

## Basic Usage

```ts
import { generateCode } from '@opentiny/genui-sdk-react/code-generator';
import { materialsMeta } from '@opentiny/genui-sdk-materials-react-antd/meta';

const componentsMap = materialsMeta.materials.flatMap((material) =>
  (material.data?.materials?.components ?? [])
    .filter((item) => item.npm?.package)
    .map((item) => ({
      componentName: item.component,
      package: item.npm.package,
      exportName: item.npm.exportName,
    })),
);

const { panelName, panelValue, errors } = await generateCode({
  pageInfo: {
    name: 'OrderForm',
    schema: {
      componentName: 'Page',
      state: { keyword: '' },
      children: [
        {
          componentName: 'AntInput',
          props: {
            value: { type: 'JSExpression', value: 'this.state.keyword' },
            onChange: {
              type: 'JSFunction',
              value: 'function(e) { this.state.keyword = e.target.value; }',
            },
          },
        },
      ],
    },
  },
  componentsMap,
  formatWithPrettier: true,
});

console.log(panelName); // OrderForm.tsx
console.log(panelValue); // React TSX source
console.log(errors); // TSX syntax validation results
```

`schema` can be an object or a JSON string. Invalid JSON, empty strings, and nullish values fall back to an empty `Page`. Generation deep-clones the schema and does not mutate the caller's object.

## generateCode()

```ts
function generateCode(params: ICodeGeneratorParams): Promise<ICodeGeneratorResult>;
```

This is equivalent to `new ReactCodeGenerator().generate(params)`. TSX compile validation is enabled by default.

### Parameters

| Parameter            | Type                   | Required | Default        | Description                                                              |
| -------------------- | ---------------------- | -------- | -------------- | ------------------------------------------------------------------------ |
| `pageInfo.schema`    | `CardSchema \| string` | Yes      | —              | Page schema                                                              |
| `pageInfo.name`      | `string`               | No       | `'SchemaCard'` | Source for the file and component name; output is `{name}.tsx`           |
| `componentsMap`      | `IComponentMapItem[]`  | No       | `[]`           | Maps schema component names to npm exports                               |
| `formatWithPrettier` | `boolean`              | No       | `false`        | Format with Prettier; returns the unformatted source if formatting fails |

### Result

| Field          | Type                      | Description                                                                               |
| -------------- | ------------------------- | ----------------------------------------------------------------------------------------- |
| `panelName`    | `string`                  | File name, such as `SchemaCard.tsx`                                                       |
| `panelValue`   | `string`                  | React TSX source                                                                          |
| `panelType`    | `'react'`                 | Always React                                                                              |
| `type`         | `'page'`                  | Always a page                                                                             |
| `prettierOpts` | `Record<string, unknown>` | Prettier options used for this run                                                        |
| `errors`       | `{ message: string }[]`   | Validation errors (TSX compile validation, schema CSS parsing); empty when there are none |

## IComponentMapItem

| Field           | Type     | Required | Description                                                              |
| --------------- | -------- | -------- | ------------------------------------------------------------------------ |
| `componentName` | `string` | Yes      | Component name in the schema                                             |
| `package`       | `string` | Yes      | npm package name                                                         |
| `exportName`    | `string` | No       | Package export; a different name generates `exportName as componentName` |

Mappings without `componentName` or `package` are ignored. The first mapping wins when a component is repeated. Custom components without a mapping do not receive an import, so add those imports in the exported file.

## ReactCodeGenerator

Instantiate the generator to customize formatting or disable compile validation:

```ts
import { ReactCodeGenerator } from '@opentiny/genui-sdk-react/code-generator';

const generator = new ReactCodeGenerator({
  prettierOpts: { printWidth: 100, singleQuote: true },
  enableCompileValidation: false,
});

const result = await generator.generate({
  pageInfo: { schema },
  formatWithPrettier: true,
});
```

| Constructor option        | Type                      | Default                 | Description                                       |
| ------------------------- | ------------------------- | ----------------------- | ------------------------------------------------- |
| `prettierOpts`            | `Record<string, unknown>` | Built-in React defaults | Merged with the defaults before invoking Prettier |
| `enableCompileValidation` | `boolean`                 | `true`                  | Validate TSX syntax with Babel                    |

## Schema-to-React Mapping

The generator handles these semantics:

- `state` becomes `useState`; assignments, increments/decrements, array mutations, and `Object.assign` in handlers and methods become immutable updates.
- `methods` become local component functions, while `refs` become `useRef` state and ref callbacks.
- `loop` becomes `Array.map`, `condition` becomes a conditional expression, and `JSSlot` becomes a render prop.
- Schema prop definitions become a TypeScript Props interface and default values.
- `lifeCycles.onMounted` and `onUnmounted` become `useEffect` behavior.
- Schema `css` is emitted in an inline `<style>` element with a page-level selector scope; when the CSS cannot be parsed it falls back to the original unscoped styles and reports the failure in `errors`.
- `this.callAction` is retained as an integration function with a runtime reminder in the exported source.

::: warning Validation boundary
Built-in validation checks TSX syntax, not real package exports or TypeScript types in your application. Run the target project's type check and build after adding the file. Ant Design projects must also import `antd/dist/reset.css` in the application entry.
:::

When React is selected, Playground uses this API to export `.tsx` source.
