# API 文档

`@opentiny/genui-sdk-core` 提供 GenUI SDK 的核心能力：协议类型、Prompt 生成、流式 Schema 提取、增量 Patch、JSON 修复等，供 Vue / Angular / Server 等上层包依赖。

## 公共方法

### genPrompt()

根据框架、物料元数据和自定义配置，拼接完整的 System Prompt。

- **类型**

```typescript
function genPrompt(
  framework: IGenPromptFramework | IGenPromptFrameworkConfig,
  materialsMeta: IMaterialsMeta,
  tgCustomConfig?: IGenPromptCustomConfig,
  options?: IGenPromptOptions,
): string
```

- **参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `framework` | `IGenPromptFramework` \| `IGenPromptFrameworkConfig` | 是 | 框架名（如 `'Vue'`）或自定义框架配置；传字符串时会合并该框架默认 rules |
| `materialsMeta` | [`IMaterialsMeta`](#imaterialsmeta) | 是 | 物料元数据，通常从物料包的 `meta` 入口引入 |
| `tgCustomConfig` | [`IGenPromptCustomConfig`](#igenpromptcustomconfig) | 否 | 自定义组件、Snippets、示例、Action |
| `options` | [`IGenPromptOptions`](#igenpromptoptions) | 否 | 控制 Prompt 各段落是否生成，以及额外 rules |

- **返回值**: `string` — 拼接后的 System Prompt

- **详细信息**

Prompt 通常包含：前缀、可用组件、JSON Schema、示例、Snippets、About This、Actions、生成规则。各段落可通过 `options` 开关裁剪。

- **示例**

```typescript
import { genPrompt } from '@opentiny/genui-sdk-core';
import { materialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';

const prompt = genPrompt(
  'Vue',
  materialsMeta,
  {
    customActions: [
      {
        name: 'openPage',
        description: 'Open a page by path',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string' },
          },
          required: ['path'],
        },
      },
    ],
  },
  { includeJsonSchema: false },
);
```

### PatternExtractor

基于正则状态机，将流式文本拆分为普通内容与被标记包裹的内容。

- **类型**

```typescript
class PatternExtractor {
  constructor(config: {
    onNormalWrite: (value: string) => void;
    onHandledWrite: (value: string) => void;
    keepFlag?: false | 'handling' | 'normal';
    regExpMap?: Record<string, Record<'full' | 'partial', RegExp>>;
  })

  setState(state: 'handling' | 'normal'): void
  reset(): void
  handleContent(content: string): string
}
```

- **参数**（构造函数 `config`）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `onNormalWrite` | `(value: string) => void` | 是 | 收到普通文本片段时的回调 |
| `onHandledWrite` | `(value: string) => void` | 是 | 收到标记内（如 schemaJson）文本片段时的回调 |
| `keepFlag` | `false` \| `'handling'` \| `'normal'` | 否 | 标记本身是否写入对应流；默认不写入 |
| `regExpMap` | `Record<string, Record<'full' \| 'partial', RegExp>>` | 否 | 自定义起止正则；默认使用 [`SchemaJsonPattern`](#schemajsonpattern) |

- **详细信息**

`handleContent` 处理增量文本，并通过回调分别输出普通流与 handled 流。

- **示例**

```typescript
import { PatternExtractor } from '@opentiny/genui-sdk-core';

const extractor = new PatternExtractor({
  onNormalWrite: (chunk) => console.log('markdown:', chunk),
  onHandledWrite: (chunk) => console.log('schemaJson:', chunk),
});

extractor.handleContent('hello ```schemaJson\n{"componentName":"Page"');
extractor.handleContent('\n}\n```');
```

### SchemaJsonPattern

提供 schemaJson 代码块的完整 / 部分匹配正则。

- **类型**

```typescript
class SchemaJsonPattern {
  get regExpMap(): {
    start: { full: RegExp; partial: RegExp };
    end: { full: RegExp; partial: RegExp };
  }
}
```

默认 start 标记为 `` ```schemaJson ``，end 标记为 `` ``` ``。可将 `regExpMap` 注入到 `PatternExtractor`。另导出 `getPartialStartRegString(flag: string): string`，用于生成可能被截断的部分匹配正则。

### StreamPatternExtractor

基于 Web Streams 的封装，将输入流拆成 `normalStream` 与 `handledStream`。

- **类型**

```typescript
class StreamPatternExtractor {
  static separate(
    stream: ReadableStream<string>,
  ): [ReadableStream<string>, ReadableStream<string>]

  get normalStream(): ReadableStream<string>
  get handledStream(): ReadableStream<string>
  handleStream(stream: ReadableStream<string>): Promise<void>
}
```

- **示例**

```typescript
import { StreamPatternExtractor } from '@opentiny/genui-sdk-core';

const [normal, handled] = StreamPatternExtractor.separate(inputStream);
```

### DeltaPatcher

基于 `jsondiffpatch` 对 Schema 做增量合并，并结合缓冲字段选择器过滤不完整字段。

- **类型**

```typescript
class DeltaPatcher {
  constructor(options?: IPatchOptions)
  patchWithDelta(oldValue: Object, newValue: Object, isCompleted: boolean): Object
}
```

- **参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `options` | [`IPatchOptions`](#ipatchoptions) | 否 | 构造时传入缓冲字段选择器等配置 |
| `oldValue` | `Object` | 是 | 当前已合并的 Schema |
| `newValue` | `Object` | 是 | 新的 Schema 快照 |
| `isCompleted` | `boolean` | 是 | 流是否结束；为 `true` 时直接全量 patch，不再缓冲 |

- **详细信息**

流式未完成时，命中 `requiredCompleteFieldSelectors` 的路径会被缓冲，直到字段完整再写入。选择器语法与 [`matchJsonPath`](#matchjsonpath) / [`jsonSelectorMatcher`](#jsonselectormatcher) 一致。

查看 [Renderer 配置缓冲字段](../../examples/renderer/required-complete-field-selectors) 了解选择器语法与默认规则。

- **示例**

```typescript
import { DeltaPatcher } from '@opentiny/genui-sdk-core';

const patcher = new DeltaPatcher({
  requiredCompleteFieldSelectors: [
    '[componentName=TinyForm] > props > labelPosition',
  ],
});

const schema = {};
patcher.patchWithDelta(schema, partialSchema, false);
patcher.patchWithDelta(schema, finalSchema, true);
```

### matchJsonPath()

判断 JSON 某路径是否匹配 CSS-like 选择器。

- **类型**

```typescript
function matchJsonPath(
  json: Record<string, any>,
  selector: string,
  path: string,
): boolean
```

- **参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `json` | `Record<string, any>` | 是 | 完整 JSON 对象，用于解析属性选择器等上下文 |
| `selector` | `string` | 是 | CSS-like 选择器 |
| `path` | `string` | 是 | 待匹配的 JSON 路径 |

支持属性选择器 `[key=val]`、`^=` / `$=` / `*=`，伪类 `:empty` / `:object` / `:array` / `:string` / `:number` / `:boolean` / `:null`，以及子组合 `>`。

查看 [Renderer 配置缓冲字段](../../examples/renderer/required-complete-field-selectors) 了解详细用法和选择器语法。

### jsonSelectorMatcher()

判断 delta 路径是否命中缓冲字段选择器，并返回最长匹配路径。

- **类型**

```typescript
function jsonSelectorMatcher(
  json: Record<string, any>,
  selector: string,
  lastDeltaKeys: string,
): { isMatch: boolean; matchPath: string }
```

- **参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `json` | `Record<string, any>` | 是 | 当前 JSON 对象 |
| `selector` | `string` | 是 | 缓冲字段选择器 |
| `lastDeltaKeys` | `string` | 是 | 本次 delta 变更的路径 |

主要由 `DeltaPatcher` 内部使用，也可在自定义 patch 逻辑中复用。另导出 `findGroupSelector`、`matchSelector`、`matchGroup`。

查看 [Renderer 配置缓冲字段](../../examples/renderer/required-complete-field-selectors) 了解选择器语法。

### repairJson()

尝试解析或修复不完整 / 格式错误的 JSON 字符串。

- **类型**

```typescript
function repairJson(jsonString: string | undefined): {
  state: RepairJsonState;
  value: any | undefined;
}

function safeJsonParse(jsonString: string): any | undefined
```

- **参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `jsonString` | `string` \| `undefined` | 是 | 待解析或修复的 JSON 文本 |

- **返回值**

| 字段 | 类型 | 说明 |
|------|------|------|
| `state` | [`RepairJsonState`](#repairjsonstate) | 解析结果状态 |
| `value` | `any` \| `undefined` | 解析成功时的对象；失败为 `undefined` |

- **详细信息**

先 `JSON.parse`；失败则先进行结构修复再走 `jsonrepair`。`safeJsonParse` 仅做安全解析，失败返回 `undefined`。

- **示例**

```typescript
import { repairJson, RepairJsonState } from '@opentiny/genui-sdk-core';

const { state, value } = repairJson('{"componentName":"Page"');
if (state === RepairJsonState.SUCCESS || state === RepairJsonState.REPAIRED) {
  console.log(value);
}
```

### buildMaterialDefaultValueMap()

从物料元数据中提取组件属性默认值映射，供 Renderer 合并默认 Props。

- **类型**

```typescript
function buildMaterialDefaultValueMap(
  materialsMeta?: Partial<IMaterialsMeta>,
): MaterialDefaultValueMap
```

- **参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `materialsMeta` | `Partial<IMaterialsMeta>` | 否 | 物料元数据，见 [`IMaterialsMeta`](#imaterialsmeta)；缺省时返回空映射 |

- **返回值**: [`MaterialDefaultValueMap`](#materialdefaultvaluemap)

## 类型

### CardSchema

```typescript
interface JSExpression {
  type: 'JSExpression';
  value: string;
  model?: boolean;
}

interface JSFunction {
  type: 'JSFunction';
  value: string;
  params?: string[];
}

type Methods = Record<string, JSFunction>;

interface LifeCycles {
  onMounted?: JSFunction;
  onUnmounted?: JSFunction;
}

interface Node {
  id?: string;
  componentName: string;
  props?: Record<string, any>;
  children?: Node[] | string;
  componentType?: 'Block' | 'PageStart' | 'PageSection';
  slot?: string | Record<string, any>;
  params?: string[];
  loop?: Record<string, any>;
  loopArgs?: string[];
  condition?: boolean | Record<string, any>;
}

type RootNode = Omit<Node, 'id'> & {
  css?: string;
  state?: Record<string, any>;
  methods?: Methods;
  lifeCycles?: LifeCycles;
};

type CardSchema = RootNode;
type NodeSchema = Node;
```

### IChatMessage

```typescript
interface IStreamDelta {
  reasoning_content?: string | null;
  content?: string | null;
  tool_calls?: any;
  tool_calls_result?: any;
}

type IMessageItem =
  | { type: 'schema-card'; content: any; id?: string; state?: Record<string, any> }
  | { type: 'markdown'; content: string }
  | { type: 'reasoning'; content: string; thinking?: boolean }
  | { type: 'tool'; name: string; status: string; content?: any; [key: string]: any }
  | { type: string; content: any; [customKey: string]: any };

interface IChatMessage {
  role: 'assistant';
  content: string;
  messages: IMessageItem[];
  [key: string]: any;
}
```

### IMaterials

```typescript
interface IMaterials {
  components?: Record<string, unknown>; // 组件名 → 运行时组件
  requiredCompleteFieldSelectors?: string[]; // 缓冲字段选择器
  defaultPropsMap?: Record<string, any>; // 组件默认 Props 映射
  [key: string]: any;
}
```

### IMaterialsMeta

```typescript
interface IExample {
  id?: string;
  name: string;
  description?: string;
  schema: CardSchema;
}

interface IMaterialsMeta {
  materials: IMaterialsProtocol[]; // 物料协议数据
  examples: IExample[]; // Prompt 示例
  whiteList: string[]; // 组件白名单
  wrapperComponent?: string; // 包装组件名，默认如 TinyCard
  rules?: string[]; // 物料侧生成规则
}
```

### MaterialDefaultValueMap

```typescript
type MaterialDefaultValueMap = Record<string, Record<string, any>>; // 组件名 → 属性默认值
```

### IGenPromptFramework

```typescript
type IGenPromptFramework = 'Vue' | 'React' | 'Angular' | string;
```

### IGenPromptFrameworkConfig

```typescript
interface IGenPromptFrameworkConfig {
  rules?: string[]; // 框架默认生成规则
}
```

### IGenPromptCustomConfig

```typescript
interface IGenPromptCustomConfig {
  customComponents?: IGenPromptComponent[]; // 自定义组件描述
  customSnippets?: IGenPromptSnippet[]; // 自定义 Snippets
  customExamples?: IGenPromptExample[]; // 自定义示例
  customActions?: IGenPromptAction[]; // 自定义 Action
}

interface IGenPromptAction {
  name: string;
  description?: string;
  parameters?: JSONSchema;
  return?: JSONSchema; // 返回值 JSON Schema（可选）
  async?: boolean; // 是否为异步 Action，默认 false
}
```

### IGenPromptOptions

```typescript
interface IGenPromptOptions {
  isSkill?: boolean; // 是否使用 Skill 模式前缀与规则，默认 false
  includeJsonSchema?: boolean; // 是否包含 JSON Schema 段落，默认 true
  includeSnippets?: boolean; // 是否包含 Snippets 段落，默认 true
  includeExamples?: boolean; // 是否包含 Examples 段落，默认 true
  includeActions?: boolean; // 是否包含 Actions 段落，默认 true
  includeAboutThis?: boolean; // 是否包含 About This 段落，默认 true
  includeBaseRules?: boolean; // 是否包含基础规则，默认 true
  rules?: string[]; // 额外规则，会与物料 rules、框架默认 rules 合并
}
```

### IPatchOptions

```typescript
interface IPatchOptions {
  requiredCompleteFieldSelectors?: string[]; // 缓冲字段选择器
}
```

### RepairJsonState

```typescript
enum RepairJsonState {
  INVALID_INPUT = 'invalid-input', // 输入无效
  SUCCESS = 'success-parse', // 直接解析成功
  REPAIRED = 'repaired-parse', // 修复后解析成功
  FAILED = 'failed-repair', // 修复失败
}
```
