# 物料 utils 与 typeSchema

物料 `utils` 用于向页面提供可复用的 JavaScript 工具。LLM 生成页面时，可以直接在 `JSFunction` 或 `JSExpression` 中编写 `this.utils.xxx` 调用，**无需在页面 schema 中声明 `utils` 字段**。

`typeSchema` 是这些工具的调用说明，当前采用**自定义 JSON Schema 字符串**。它描述函数、类、参数、返回值和方法，供 LLM 阅读；它不是 TypeScript 类型表达式，也不是用于校验页面数据的标准 JSON Schema。

## 一、两条链路

`utils` 分为描述链路和运行链路，两者名称和语义必须一致。

### 描述链路：告诉 LLM 有哪些工具、如何调用

物料包通过 `IMaterialsMeta.utils` 提供工具描述：

```text
materialsMeta.utils
  → genPrompt
  → genUtilsPrompt
  → LLM 读取工具说明并生成 this.utils.xxx 调用
```

每项描述使用 `IUtilsMeta`：

```ts
export interface IUtilsMeta {
  /** 与运行时注册表中的键名一致 */
  name: string;
  /** 工具的用途和必要语义 */
  description?: string;
  /** 自定义 JSON Schema 字符串 */
  typeSchema: string;
  /** 真实可执行的 JavaScript 调用示例 */
  usage?: string;
}
```

`typeSchema` 的字段类型仍是 `string`，但内容是序列化后的 JSON。这里的字符串只是 prompt 的传输载体，不应写成 TS 函数签名或 d.ts 片段。

### 运行链路：把真实实现注入渲染上下文

物料包通过 `IMaterials.utils` 注册真实值：

```ts
export const materials: IMaterials = {
  utils: {
    formatDate,
    formatMoney,
    EventBus,
  },
};
```

渲染器将这些值注入页面上下文，页面代码最终通过 `this.utils.formatDate(...)`、`new this.utils.EventBus()` 等方式执行。

`typeSchema` 不参与运行，也不会决定某个工具是否存在。运行时能否调用，取决于 `materials.utils` 中是否注册了对应实现。

使用 `mergeMaterials` 合并多个物料包时，同名 `utils` 由后注册的物料包覆盖。替换实现时，应同步检查描述是否仍然准确。

## 二、为什么使用结构化 JSON

当前方案重点是**易维护、易审视**，而不是用 JSON Schema 校验运行时数据：

- 参数名、类型、顺序、可选性、默认值都有独立字段，语义不依赖一段签名字符串。
- 返回值、嵌套函数和实例方法可以递归展开，链式调用所需的结构不会压缩在单行文本中。
- 修改某个参数或方法时，JSON diff 能直接显示变更位置，便于代码评审。
- 可以解析 JSON 并对具体字段编写测试，避免名称、参数和返回值描述悄悄漂移。
- 多行 JSON 统一使用 `json` 代码围栏进入 prompt，模型看到的是结构化 API 文档。

这是一套面向代码调用的自定义约定。标准 JSON Schema 主要描述数据，不具备本文使用的 `function`、`class`、`params`、`returns`、`methods` 等调用语义。

## 三、typeSchema 的常用结构

### 函数与联合类型

下面以实际的 `formatMoney(value, digits)` 为例。使用 `JSON.stringify` 可以直接得到 `typeSchema` 所需的多行字符串，同时保留可读的源码结构：

```ts
const formatMoneyMeta: IUtilsMeta = {
  name: 'formatMoney',
  description: '格式化金额：千分位分隔 + 固定小数位',
  typeSchema: JSON.stringify(
    {
      type: 'function',
      params: [
        {
          name: 'value',
          type: 'union',
          types: ['number', 'string'],
        },
        {
          name: 'digits',
          type: 'number',
          optional: true,
          default: 2,
        },
      ],
      returns: {
        type: 'string',
      },
    },
    null,
    2,
  ),
  usage: 'this.utils.formatMoney(1234.5, 2)',
};
```

字段约定：

- `type: 'function'` 表示可调用函数。
- `params` 按真实参数顺序排列。
- `type: 'union'` 配合 `types` 表示联合类型。
- `optional` 表示可选参数，`default` 记录默认值。
- `variadic: true` 表示剩余参数，例如 EventBus 的 `...args`。
- `generic` 描述泛型名称，参数和返回值可以通过该名称引用它。
- `returns` 描述返回值；既可以使用类型字符串简写，也可以使用对象继续展开。

### 嵌套函数与实例方法

工具返回函数或对象时，可以继续描述其参数和方法。例如防抖函数的返回值带有 `cancel`、`flush`：

```json
{
  "type": "function",
  "generic": "T",
  "params": [
    { "name": "func", "type": "T" },
    { "name": "wait", "type": "number", "optional": true }
  ],
  "returns": {
    "type": "function",
    "methods": [
      { "name": "cancel", "params": [], "returns": "void" },
      { "name": "flush", "params": [], "returns": "unknown" }
    ]
  }
}
```

类使用 `type: 'class'`，通过 `methods` 描述实例方法。下面的 `EventBus.on` 同时包含回调参数和取消订阅函数：

```json
{
  "type": "class",
  "name": "EventBus",
  "methods": [
    {
      "name": "on",
      "params": [
        { "name": "event", "type": "string" },
        {
          "name": "handler",
          "type": "function",
          "params": [
            { "name": "args", "variadic": true, "type": "unknown" }
          ],
          "returns": "void"
        }
      ],
      "returns": {
        "type": "function",
        "params": [],
        "returns": "void"
      }
    }
  ]
}
```

如果返回值是带方法的对象，例如 `Dayjs`，同样在 `returns.methods` 中列出允许模型使用的 `add`、`format`、`isAfter` 等方法。`Dayjs`、泛型 `T` 等名称属于类型引用，不需要强行转换为标准 JSON Schema 的数据类型。

## 四、进入 prompt 后的形态

`genUtilsPrompt` 将每项工具渲染为名称、结构化类型、说明和示例。单行 JSON 使用行内代码，多行 JSON 使用 `json` 围栏：

````text
- `this.utils.formatMoney`：
  ```json
  {
    "type": "function",
    "params": [
      {
        "name": "value",
        "type": "union",
        "types": [
          "number",
          "string"
        ]
      },
      {
        "name": "digits",
        "type": "number",
        "optional": true,
        "default": 2
      }
    ],
    "returns": {
      "type": "string"
    }
  }
  ```
  - 说明：格式化金额：千分位分隔 + 固定小数位
  - 示例：`this.utils.formatMoney(1234.5, 2)`
````

页面 schema 只需要保存生成的调用表达式：

```json
{
  "type": "JSExpression",
  "value": "this.utils.formatMoney(this.state.amount, 2)"
}
```

## 五、新增或修改工具时的要求

1. 在 `materials.utils` 注册真实实现，在 `materialsMeta.utils` 提供同名描述。
2. 保持 `name` 与注册表键名完全一致，不描述未注册或已删除的工具。
3. 按实现维护参数顺序、参数名、类型、`optional`、`default` 和 `variadic`。
4. 返回函数、类实例或链式对象时，同步维护 `returns` 和 `methods`，确保 `usage` 只调用已描述且真实存在的 API。
5. 修改函数行为时同步更新 `description`；不要通过描述声明实现并不支持的重载、货币符号等能力。
6. 更新相关示例，确保表达式能基于初始 state 和当前 utils 直接求值。
7. 运行物料测试，检查所有 `typeSchema` 均可被 `JSON.parse` 解析，且元数据名称集合与运行时注册表一致。

当前 Vue OpenTiny 物料的实现与描述分别位于：

- [utils.ts](file:///Users/aplo/Desktop/aplo/project/github/genui-sdk/packages/materials/vue-opentiny-vue/src/materials/utils/utils.ts)：运行时注册表。
- [utils-meta-schemes.ts](file:///Users/aplo/Desktop/aplo/project/github/genui-sdk/packages/materials/vue-opentiny-vue/src/meta/utils-meta-schemes.ts)：LLM 元数据。
- [utils-meta-schemes.spec.ts](file:///Users/aplo/Desktop/aplo/project/github/genui-sdk/packages/materials/vue-opentiny-vue/tests/utils-meta-schemes.spec.ts)：注册一致性、JSON 合法性及真实调用示例的回归测试。
- [utils.ts](file:///Users/aplo/Desktop/aplo/project/github/genui-sdk/packages/core/src/prompt-generator/utils.ts)：prompt 渲染逻辑。
