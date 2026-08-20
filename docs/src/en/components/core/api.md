# API Reference

`@opentiny/genui-sdk-core` provides the core capabilities of GenUI SDK: protocol types, prompt generation, streaming schema extraction, delta patching, JSON repair, and more. It is consumed by Vue / Angular / Server packages.


## Public APIs

### genPrompt()

Builds a full system prompt from framework, materials metadata, and optional custom config.

- **Type**

```typescript
function genPrompt(
  framework: IGenPromptFramework | IGenPromptFrameworkConfig,
  materialsMeta: IMaterialsMeta,
  tgCustomConfig?: IGenPromptCustomConfig,
  options?: IGenPromptOptions,
): string
```

- **Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `framework` | `IGenPromptFramework` \| `IGenPromptFrameworkConfig` | Yes | Framework name (e.g. `'Vue'`) or custom framework config; string form merges that framework’s default rules |
| `materialsMeta` | [`IMaterialsMeta`](#imaterialsmeta) | Yes | Materials metadata, usually imported from a materials package `meta` entry |
| `tgCustomConfig` | [`IGenPromptCustomConfig`](#igenpromptcustomconfig) | No | Custom components, snippets, examples, and actions |
| `options` | [`IGenPromptOptions`](#igenpromptoptions) | No | Toggle prompt sections and append extra rules |

- **Returns**: `string` — the assembled system prompt

- **Details**

A prompt typically includes: prefix, available components, JSON Schema, examples, snippets, About This, actions, and generation rules. Use `options` to include or omit sections.

- **Example**

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

A regex state machine that splits streaming text into normal content and marked content.

- **Type**

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

- **Parameters** (`config`)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `onNormalWrite` | `(value: string) => void` | Yes | Callback for normal text chunks |
| `onHandledWrite` | `(value: string) => void` | Yes | Callback for text inside markers (e.g. schemaJson) |
| `keepFlag` | `false` \| `'handling'` \| `'normal'` | No | Whether markers themselves are written to a stream; default off |
| `regExpMap` | `Record<string, Record<'full' \| 'partial', RegExp>>` | No | Custom start/end regexes; defaults to [`SchemaJsonPattern`](#schemajsonpattern) |

- **Details**

`handleContent` processes incremental text and emits chunks via callbacks.

- **Example**

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

Provides full / partial match regexes for schemaJson fenced blocks.

- **Type**

```typescript
class SchemaJsonPattern {
  get regExpMap(): {
    start: { full: RegExp; partial: RegExp };
    end: { full: RegExp; partial: RegExp };
  }
}
```

Default start marker is `` ```schemaJson ``, end marker is `` ``` ``. Inject `regExpMap` into `PatternExtractor` when needed. Also exports `getPartialStartRegString(flag: string): string` for truncated prefix matching.

### StreamPatternExtractor

Web Streams wrapper that forks an input stream into `normalStream` and `handledStream`.

- **Type**

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

- **Example**

```typescript
import { StreamPatternExtractor } from '@opentiny/genui-sdk-core';

const [normal, handled] = StreamPatternExtractor.separate(inputStream);
```

### DeltaPatcher

Merges schema objects incrementally with `jsondiffpatch`, filtering incomplete fields via buffer-field selectors.

- **Type**

```typescript
class DeltaPatcher {
  constructor(options?: IPatchOptions)
  patchWithDelta(oldValue: Object, newValue: Object, isCompleted: boolean): Object
}
```

- **Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `options` | [`IPatchOptions`](#ipatchoptions) | No | Constructor options such as buffer-field selectors |
| `oldValue` | `Object` | Yes | Current merged schema |
| `newValue` | `Object` | Yes | New schema snapshot |
| `isCompleted` | `boolean` | Yes | Whether the stream has finished; `true` patches eagerly without buffering |

- **Details**

While streaming, paths matching `requiredCompleteFieldSelectors` are buffered until complete. Selector syntax matches [`matchJsonPath`](#matchjsonpath) / [`jsonSelectorMatcher`](#jsonselectormatcher).

See [Renderer - Buffer Field Configuration](../../examples/renderer/required-complete-field-selectors) for selector syntax and defaults.

- **Example**

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

Checks whether a JSON path matches a CSS-like selector.

- **Type**

```typescript
function matchJsonPath(
  json: Record<string, any>,
  selector: string,
  path: string,
): boolean
```

- **Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `json` | `Record<string, any>` | Yes | Full JSON object for attribute-selector context |
| `selector` | `string` | Yes | CSS-like selector |
| `path` | `string` | Yes | JSON path to test |

Supports attribute selectors `[key=val]`, `^=` / `$=` / `*=`, pseudos `:empty` / `:object` / `:array` / `:string` / `:number` / `:boolean` / `:null`, and child combinator `>`.

See [Renderer - Buffer Field Configuration](../../examples/renderer/required-complete-field-selectors) for detailed usage and selector syntax.

### jsonSelectorMatcher()

Checks whether a delta path hits a buffer-field selector and returns the longest match path.

- **Type**

```typescript
function jsonSelectorMatcher(
  json: Record<string, any>,
  selector: string,
  lastDeltaKeys: string,
): { isMatch: boolean; matchPath: string }
```

- **Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `json` | `Record<string, any>` | Yes | Current JSON object |
| `selector` | `string` | Yes | Buffer-field selector |
| `lastDeltaKeys` | `string` | Yes | Path of the current delta change |

Used mainly by `DeltaPatcher`; reusable in custom patch logic. Also exports `findGroupSelector`, `matchSelector`, `matchGroup`.

See [Renderer - Buffer Field Configuration](../../examples/renderer/required-complete-field-selectors) for selector syntax.

### repairJson()

Parses or repairs incomplete / malformed JSON strings.

- **Type**

```typescript
function repairJson(jsonString: string | undefined): {
  state: RepairJsonState;
  value: any | undefined;
}

function safeJsonParse(jsonString: string): any | undefined
```

- **Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `jsonString` | `string` \| `undefined` | Yes | JSON text to parse or repair |

- **Returns**

| Field | Type | Description |
|-------|------|-------------|
| `state` | [`RepairJsonState`](#repairjsonstate) | Parse result state |
| `value` | `any` \| `undefined` | Parsed object on success; `undefined` on failure |

- **Details**

Tries `JSON.parse` first; on failure, applies structural fixes then `jsonrepair`. `safeJsonParse` only parses safely and returns `undefined` on failure.

- **Example**

```typescript
import { repairJson, RepairJsonState } from '@opentiny/genui-sdk-core';

const { state, value } = repairJson('{"componentName":"Page"');
if (state === RepairJsonState.SUCCESS || state === RepairJsonState.REPAIRED) {
  console.log(value);
}
```

### buildMaterialDefaultValueMap()

Builds a component → default props map from materials metadata for Renderer default-prop merging.

- **Type**

```typescript
function buildMaterialDefaultValueMap(
  materialsMeta?: Partial<IMaterialsMeta>,
): MaterialDefaultValueMap
```

- **Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `materialsMeta` | `Partial<IMaterialsMeta>` | No | Materials metadata, see [`IMaterialsMeta`](#imaterialsmeta); omitted yields an empty map |

- **Returns**: [`MaterialDefaultValueMap`](#materialdefaultvaluemap)

## Types

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
  components?: Record<string, unknown>; // component name → runtime component
  requiredCompleteFieldSelectors?: string[]; // buffer-field selectors
  defaultPropsMap?: Record<string, any>; // default props map
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
  materials: IMaterialsProtocol[]; // materials protocol payload
  examples: IExample[]; // prompt examples
  whiteList: string[]; // component whitelist
  wrapperComponent?: string; // wrapper component name, e.g. TinyCard
  rules?: string[]; // materials-side generation rules
}
```

### MaterialDefaultValueMap

```typescript
type MaterialDefaultValueMap = Record<string, Record<string, any>>; // component name → prop defaults
```

### IGenPromptFramework

```typescript
type IGenPromptFramework = 'Vue' | 'React' | 'Angular' | string;
```

### IGenPromptFrameworkConfig

```typescript
interface IGenPromptFrameworkConfig {
  rules?: string[]; // framework default generation rules
}
```

### IGenPromptCustomConfig

```typescript
interface IGenPromptCustomConfig {
  customComponents?: IGenPromptComponent[]; // custom component descriptions
  customSnippets?: IGenPromptSnippet[]; // custom snippets
  customExamples?: IGenPromptExample[]; // custom examples
  customActions?: IGenPromptAction[]; // custom actions
}

interface IGenPromptAction {
  name: string;
  description?: string;
  parameters?: JSONSchema;
  return?: JSONSchema; // return-value JSON Schema (optional)
  async?: boolean; // whether the action is async, default false
}
```

### IGenPromptOptions

```typescript
interface IGenPromptOptions {
  isSkill?: boolean; // Skill-mode prefix and rules, default false
  includeJsonSchema?: boolean; // include JSON Schema section, default true
  includeSnippets?: boolean; // include Snippets section, default true
  includeExamples?: boolean; // include Examples section, default true
  includeActions?: boolean; // include Actions section, default true
  includeAboutThis?: boolean; // include About This section, default true
  includeBaseRules?: boolean; // include base rules, default true
  rules?: string[]; // extra rules merged with materials and framework defaults
}
```

### IPatchOptions

```typescript
interface IPatchOptions {
  requiredCompleteFieldSelectors?: string[]; // buffer-field selectors
}
```

### RepairJsonState

```typescript
enum RepairJsonState {
  INVALID_INPUT = 'invalid-input', // invalid input
  SUCCESS = 'success-parse', // parsed successfully
  REPAIRED = 'repaired-parse', // parsed after repair
  FAILED = 'failed-repair', // repair failed
}
```
