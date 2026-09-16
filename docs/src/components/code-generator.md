# generateCode

`generateCode` 将 SchemaJSON 转成可落地的 Vue SFC（`<template>` + `<script setup>` + `<style>`），用于导出页面源码、离线预览或二次开发。

仅使用代码生成时可从 `@opentiny/genui-sdk-vue/code-generator` 按需引入，见 [快速开始 - 按需引入](../guide/quick-start#按需引入)。主入口 `@opentiny/genui-sdk-vue` 同样会再导出该能力。

## 基本用法

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
          props: { text: '提交', type: 'primary' },
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
console.log(panelValue); // Vue SFC 源码
```

`schema` 可以是对象，也可以是 JSON 字符串。解析失败或为空时，会回退为空的 `Page`。

## generateCode()

- **类型**

```ts
function generateCode(params: ICodeGeneratorParams): Promise<ICodeGeneratorResult>
```

内部等价于 `new VueCodeGenerator().generate(params)`，默认开启编译校验。

- **参数**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `pageInfo.schema` | `CardSchema \| string` | 是 | — | 页面 Schema |
| `pageInfo.name` | `string` | 否 | `'SchemaCard'` | 输出文件名（不含扩展名），结果为 `{name}.vue` |
| `componentsMap` | `IComponentMapItem[]` | 否 | `[]` | Schema 中组件名到 npm 包的映射，用于生成 `import` |
| `formatWithPrettier` | `boolean` | 否 | `false` | 是否用 Prettier 格式化；失败时返回未格式化源码 |

- **返回值**: `Promise<ICodeGeneratorResult>`

## ICodeGeneratorResult

| 字段 | 类型 | 说明 |
|------|------|------|
| `panelName` | `string` | 文件名，如 `SchemaCard.vue` |
| `panelValue` | `string` | Vue SFC 源码 |
| `panelType` | `'vue'` | 固定为 Vue |
| `type` | `'page'` | 固定为页面 |
| `prettierOpts` | `Record<string, unknown>` | 本次使用的 Prettier 配置 |
| `errors` | `{ message: string }[]` | 编译校验错误；无错误时为空数组 |

## IComponentMapItem

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `componentName` | `string` | 是 | Schema 里的组件名，需与 `componentName` 一致 |
| `package` | `string` | 是 | npm 包名，用于 `from '...'` |
| `exportName` | `string` | 否 | 包内导出名；与 `componentName` 不同时生成 `exportName as componentName` |

缺少 `componentName` 或 `package` 的项会被忽略。Schema 中出现、但未出现在 `componentsMap` 中的组件不会生成对应 import。

可从物料协议的 `npm` 字段组装，例如：

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

需要自定义 Prettier 配置，或关闭编译校验时，直接实例化生成器：

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

### 构造选项 `IVueCodeGeneratorOptions`

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `prettierOpts` | `Record<string, unknown>` | 内置 Vue 默认项 | 与内置配置合并后用于格式化 |
| `enableCompileValidation` | `boolean` | `true` | 是否用 `@vue/compiler-sfc` 校验生成结果 |

## 生成内容

生成的 SFC 会尽量还原 Schema 语义，包括：

- 组件树对应的 `<template>`
- `state`、`methods`、`lifeCycles`、`refs` 对应的 `<script setup>`
- Schema `css` 对应的 `<style>`
- 按 `componentsMap` 写入的组件 import

Playground 的「导出 Vue 源码」即调用该 API。
