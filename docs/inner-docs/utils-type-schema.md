# 物料 utils 的 typeSchema 描述方案

## 背景与目标

GenUI 物料包通过 `IMaterials.utils` 向页面注入可用工具，LLM 生成的 schema 无需声明 utils 字段，直接在 `JSFunction` / `JSExpression` 中通过 `this.utils.xxx` 调用。

为了让 LLM **准确理解任意类型工具（函数、类、对象/service、数组、基本值）的完整用法**，需要一种类型描述结构（typeSchema）。本文对比三种候选方案。

> **实施状态（2026-10）**：已按**方案一（TS 类型字符串）**落地——`IUtilsTypeSchema` 等结构化枚举已移除，`IUtilsMeta.typeSchema` 改为 `string`，见 `packages/core/src/material/materials-meta.ts`。下文"现状"为决策前的历史背景。

## 现状

当前 `IUtilsTypeSchema`（`packages/core/src/material/materials-meta.ts`）为结构化枚举：

```ts
export interface IUtilsTypeSchema {
  type: 'function' | 'class' | 'object' | 'array' | 'string' | 'number' | 'boolean' | 'any';
  description?: string;
  params?: IUtilsParamSchema[];        // function
  returns?: string;                    // function
  constructorParams?: IUtilsParamSchema[]; // class
  properties?: IUtilsPropertySchema[]; // object / class
  methods?: IUtilsMethodSchema[];      // object / class
  items?: string;                      // array
}
```

**局限：**

1. 类型引用碎片化：`params[].type`、`returns`、`items`、`properties[].type` 均为 `string`，无法递归表达复杂嵌套类型（如"方法返回另一个类实例"）。
2. `type` 枚举固定 8 种，非"任意类型"：`Date`、`Promise`、`Record<string, any>`、联合类型只能塞进字符串。
3. 字段与 `type` 的关系靠约定而非 TS 判别联合约束，填错不报错。

## 方案一：TS 类型字符串

直接用 TypeScript 类型语法描述工具，LLM 对 TS 类型理解最深，天然支持任意类型（联合、泛型、类、函数签名），token 最省。

```ts
export interface IUtilsMeta {
  name: string;
  description?: string;
  /** TS 类型字符串，如函数签名、类声明、任意值类型 */
  typeSchema: string;
  /** 调用示例（JS 代码片段） */
  usage?: string;
}
```

**示例：**

```ts
// 函数
{
  name: 'formatDate',
  description: '格式化日期时间，支持 YYYY、MM、DD、HH、mm、ss 占位符',
  typeSchema: '(date: Date | number | string, format?: string) => string',
  usage: "this.utils.formatDate(Date.now(), 'YYYY-MM-DD HH:mm')",
}

// 类
{
  name: 'EventBus',
  description: '事件总线类，用于页面内组件间通信',
  typeSchema: 'class EventBus {\n  on(event: string, handler: (...args: unknown[]) => void): () => void;\n  emit(event: string, ...args: unknown[]): void;\n  off(event: string, handler: Function): void;\n}',
  usage: "const bus = new this.utils.EventBus(); bus.on('refresh', () => {}); bus.emit('refresh');",
}
```

**优点：** 表达力最强、支持任意类型、LLM 零学习成本、编写省力、token 最少。
**缺点：** 非结构化，程序无法解析/校验；类型与描述信息（参数说明、默认值）分离，需要 description 字段补充。

## 方案二：递归结构化 typeSchema

增强当前结构：所有类型引用改为可递归嵌套的 `IUtilsTypeSchema`，不再用字符串。

```ts
export interface IUtilsTypeSchema {
  type: string; // 'function' | 'class' | 'object' | 'array' | 'string' | 'number' | 'boolean' | 'Date' | 'Promise' | ...
  description?: string;
  params?: IUtilsParamSchema[];                  // function
  returns?: IUtilsTypeSchema;                    // function，递归
  constructorParams?: IUtilsParamSchema[];       // class
  properties?: IUtilsPropertySchema[];           // object / class，property.type 递归
  methods?: IUtilsMethodSchema[];                // object / class，returns 递归
  items?: IUtilsTypeSchema;                      // array，递归
  defaultValue?: string;
}

export interface IUtilsParamSchema {
  name: string;
  description?: string;
  type?: IUtilsTypeSchema; // 递归
  optional?: boolean;
  defaultValue?: string;
}
```

**示例：**

```ts
{
  name: 'formatDate',
  description: '格式化日期时间，支持 YYYY、MM、DD、HH、mm、ss 占位符',
  typeSchema: {
    type: 'function',
    params: [
      { name: 'date', description: '日期对象或时间戳', type: { type: 'any', description: 'Date | number | string' } },
      { name: 'format', type: { type: 'string' }, optional: true, defaultValue: 'YYYY-MM-DD' },
    ],
    returns: { type: 'string' },
  },
  usage: "this.utils.formatDate(Date.now(), 'YYYY-MM-DD HH:mm')",
}
```

**优点：** 结构化、可程序化渲染与校验；嵌套类型精确。
**缺点：** 编写繁琐冗长；`type` 枚举仍需扩展或用字符串兜底；token 消耗较大。

## 方案三：JSON Schema（zod 生成）

业界标准（OpenAI function calling、MCP tool schema 同款），用 zod 定义后经 `zodToJsonSchema` 转换。

```ts
import { z } from 'zod';

const formatDateSchema = z
  .object({
    type: z.literal('function'),
    params: z.array(z.object({ name: z.string(), type: z.string().optional(), optional: z.boolean().optional() })),
    returns: z.string().optional(),
  });

export const utilsMeta = [
  {
    name: 'formatDate',
    description: '格式化日期时间，支持 YYYY、MM、DD、HH、mm、ss 占位符',
    typeSchema: formatDateSchema, // 运行时 zodToJsonSchema 转 JSON
    usage: "this.utils.formatDate(Date.now(), 'YYYY-MM-DD HH:mm')",
  },
];
```

转换后（示意）：

```json
{
  "name": "formatDate",
  "description": "格式化日期时间，支持 YYYY、MM、DD、HH、mm、ss 占位符",
  "typeSchema": {
    "type": "object",
    "properties": {
      "type": { "const": "function" },
      "params": { "type": "array", "items": { "type": "object", "properties": { "name": { "type": "string" }, "type": { "type": "string" }, "optional": { "type": "boolean" } } } },
      "returns": { "type": "string" }
    }
  },
  "usage": "this.utils.formatDate(Date.now(), 'YYYY-MM-DD HH:mm')"
}
```

**优点：** 业界标准、LLM 训练充分；zod 提供编译期校验与类型推导；可与 function calling 打通。
**缺点：** JSON 冗长、token 消耗大；函数/类语义需自定义约定（JSON Schema 无 function/class keyword）；编写成本高。

## 对比

| 维度 | TS 类型字符串 | 递归结构化 typeSchema | JSON Schema（zod） |
| --- | --- | --- | --- |
| 任意类型表达力（联合/泛型/类） | 最强 | 中（需扩展枚举） | 中（需自定义约定） |
| LLM 理解成本 | 最低（TS 语料极多） | 中 | 中 |
| 程序可解析/校验 | 无 | 强 | 最强 |
| 编写成本 | 最低 | 较高 | 高 |
| prompt token 消耗 | 最少 | 中 | 最高 |
| 与 function calling 打通 | 难 | 需转换 | 原生 |
| 递归复杂嵌套类型 | 天然支持 | 支持 | 支持 |

## 结论与建议

**推荐方案一（TS 类型字符串）**，理由：

1. utils 本质是"页面可用 API 文档"，LLM 需要理解的是**语义与用法**，TS 类型是其最熟悉的表达语言，理解准确度最高。
2. "任意类型"（函数、类、service 实例、联合类型、泛型）在 TS 语法下零成本表达，无需维护枚举与递归结构。
3. token 最省，prompt 更精简，降低生成成本。
4. 程序校验非必需：typeSchema 仅用于 LLM 提示词，不参与运行时逻辑（运行时只取 `IMaterials.utils` 注册表）。

若后续需要将 utils 描述接入 function calling / 工具协议，可在方案一基础上额外提供 zod 转 JSON Schema 的适配层，不影响提示词侧的表达方式。
