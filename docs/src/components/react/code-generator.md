# generateCode

React `generateCode` 将 SchemaJSON 转换为可独立编辑的 React TSX 组件。生成结果直接使用物料组件、React state、事件函数和 JSX，不依赖运行时 `GenuiRenderer`。

仅使用代码生成时，可从 `@opentiny/genui-sdk-react/code-generator` 按需引入。主入口 `@opentiny/genui-sdk-react` 也会导出该能力。

## 基本用法

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
console.log(panelValue); // React TSX 源码
console.log(errors); // TSX 语法校验结果
```

`schema` 可以是对象或 JSON 字符串。解析失败、空字符串或空值会回退为空的 `Page`。生成过程会深拷贝 Schema，不修改调用方传入的对象。

## generateCode()

```ts
function generateCode(params: ICodeGeneratorParams): Promise<ICodeGeneratorResult>;
```

内部等价于 `new ReactCodeGenerator().generate(params)`，默认开启 TSX 编译校验。

### 参数

| 参数                 | 类型                   | 必填 | 默认值         | 说明                                               |
| -------------------- | ---------------------- | ---- | -------------- | -------------------------------------------------- |
| `pageInfo.schema`    | `CardSchema \| string` | 是   | —              | 页面 Schema                                        |
| `pageInfo.name`      | `string`               | 否   | `'SchemaCard'` | 文件名和组件名来源，输出文件为 `{name}.tsx`        |
| `componentsMap`      | `IComponentMapItem[]`  | 否   | `[]`           | Schema 组件名到 npm 包导出的映射                   |
| `formatWithPrettier` | `boolean`              | 否   | `false`        | 是否使用 Prettier 格式化；格式化失败时返回原始源码 |

### 返回值

| 字段           | 类型                      | 说明                                     |
| -------------- | ------------------------- | ---------------------------------------- |
| `panelName`    | `string`                  | 文件名，如 `SchemaCard.tsx`              |
| `panelValue`   | `string`                  | React TSX 源码                           |
| `panelType`    | `'react'`                 | 固定为 React                             |
| `type`         | `'page'`                  | 固定为页面                               |
| `prettierOpts` | `Record<string, unknown>` | 本次使用的 Prettier 配置                 |
| `errors`       | `{ message: string }[]`   | Babel TSX 编译校验错误；无错误时为空数组 |

## IComponentMapItem

| 字段            | 类型     | 必填 | 说明                                                 |
| --------------- | -------- | ---- | ---------------------------------------------------- |
| `componentName` | `string` | 是   | Schema 中的组件名                                    |
| `package`       | `string` | 是   | npm 包名                                             |
| `exportName`    | `string` | 否   | 包内导出名；不同时生成 `exportName as componentName` |

缺少 `componentName` 或 `package` 的映射会被忽略；同一组件重复配置时使用第一项。未配置映射的自定义组件不会生成 import，需要在导出文件中自行补充。

## ReactCodeGenerator

需要调整格式或关闭编译校验时，可直接实例化：

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

| 构造选项                  | 类型                      | 默认值            | 说明                         |
| ------------------------- | ------------------------- | ----------------- | ---------------------------- |
| `prettierOpts`            | `Record<string, unknown>` | 内置 React 默认项 | 与默认项合并后传给 Prettier  |
| `enableCompileValidation` | `boolean`                 | `true`            | 是否使用 Babel 校验 TSX 语法 |

## Schema 到 React 的映射

生成器会处理以下语义：

- `state` 转为 `useState`；事件和方法中的赋值、递增/递减、数组变更方法及 `Object.assign` 转为不可变更新。
- `methods` 转为组件内函数，`refs` 转为 `useRef` 和 ref callback。
- `loop` 转为 `Array.map`，`condition` 转为条件表达式，`JSSlot` 转为 render prop。
- Schema 的 props 定义转为 TypeScript Props 接口和默认值。
- `lifeCycles.onMounted` / `onUnmounted` 转为 `useEffect`。
- Schema `css` 写入组件内 `<style>`，并加页面级选择器作用域。
- `this.callAction` 会保留为待接入函数，并在导出代码中给出运行时提示。

::: warning 校验边界
内置校验负责 TSX 语法，不解析业务工程中的实际包导出和 TypeScript 类型。将文件放入目标项目后，仍应运行该项目的类型检查与构建。Ant Design 项目还需在应用入口引入 `antd/dist/reset.css`。
:::

Playground 在选择 React 技术栈后，会通过该 API 导出 `.tsx` 源码。
