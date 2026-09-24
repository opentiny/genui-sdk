# API 文档

`@opentiny/genui-sdk-skill-generator` 将 `genPrompt` 生成的完整 Prompt 转换为 Agent 可按需加载的 `SKILL.md` 与 `reference/` 分片，适用于 Cursor、Claude Code 等支持 Skill 的 Agent。

## 安装

```bash
pnpm add @opentiny/genui-sdk-skill-generator
```

## 核心 API

### generateSkillFiles()

根据框架、物料元数据与生成选项创建 Skill 文件。这是编程式调用的推荐入口。

- **类型**

```typescript
function generateSkillFiles(
  framework: IGenPromptFramework | IGenPromptFrameworkConfig,
  materialsMeta: IMaterialsMeta,
  options: IGenerateSkillOptions,
): IGenerateSkillResult
```

- **参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `framework` | `IGenPromptFramework \| IGenPromptFrameworkConfig` | 是 | 框架名（如 `'vue'`、`'angular'`、`'react'`）或自定义框架规则 |
| `materialsMeta` | `IMaterialsMeta` | 是 | 物料元数据，通常从物料包的 `meta` 入口引入 |
| `options` | [`IGenerateSkillOptions`](#igenerateskilloptions) | 是 | 输出目录、Prompt 配置、分片策略与 formatter |

- **返回值**

返回 [`IGenerateSkillResult`](#igenerateskillresult)，包含完整 Prompt、拆分结果和调用方传入的输出目录；相对路径会保持为相对路径。该方法为同步方法，文件写入或校验失败时会直接抛出错误。

- **详细信息**

默认生成流程如下：

1. 调用 core 包的 `genPrompt`，并默认启用 `isSkill`。
2. 将 Prompt 的二级标题章节无损拆分到 `reference/generated/`。
3. 当组件章节包含可解析的 JSON 代码围栏时，按组件类型生成详情文件，然后同步 `reference/components.md` 白名单索引。
4. 保留第一个输出目录中已有 `SKILL.md` 的 YAML frontmatter，再写入所有输出目录。
5. 从磁盘重新读取生成文件，校验其能逐字还原原始 Prompt。

设置 `flatPrompt: true` 后，完整 Prompt 会直接写入 `SKILL.md`，不会生成 `reference/` 分片，也不会调用 `formatSkillBody`。

- **示例**

```typescript
import {
  buildGenuiSchemaSkillBody,
  generateSkillFiles,
} from '@opentiny/genui-sdk-skill-generator';
import { materialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';

const result = generateSkillFiles('vue', materialsMeta, {
  skillDirs: ['./skills/genui-schema-json'],
  formatSkillBody: buildGenuiSchemaSkillBody,
  referenceSubdir: 'generated',
  syncComponentsIndex: true,
  prune: true,
});

console.log(result.skillDirs);
```

### genSkillContent()

只生成并拆分 Skill 内容，不执行文件 IO。适合预览生成结果或接入自定义存储。

- **类型**

```typescript
function genSkillContent(
  framework: IGenPromptFramework | IGenPromptFrameworkConfig,
  materialsMeta: IMaterialsMeta,
  tgCustomConfig?: IGenPromptCustomConfig,
  promptOptions?: IGenPromptOptions,
  options?: { flatPrompt?: boolean },
): IGenSkillContent
```

`promptOptions.isSkill` 未设置时会自动设为 `true`。启用 `flatPrompt` 时，`skillPrefix` 等于完整 `prompt`，`sections` 和 `sectionMarkers` 为空。

```typescript
import { genSkillContent } from '@opentiny/genui-sdk-skill-generator';
import { materialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';

const { skillPrefix, sections, sectionMarkers } = genSkillContent(
  'vue',
  materialsMeta,
);
```

### buildGenuiSchemaSkillBody()

生成内置 `genui-schema-json` Skill 的 Agent 友好正文，包括输出格式、按需读取工作流、组件类型索引与生成文件目录。它只链接当前 Skill 目录中实际存在的文件。

- **类型**

```typescript
function buildGenuiSchemaSkillBody(
  sectionMarkers: IPromptSectionMarker[],
  context: ISkillBodyContext,
): string

interface ISkillBodyContext {
  skillDir: string;
  referenceSubdir?: string;
  componentGroups?: IComponentCategoryGroup[];
  wrapperComponent?: string;
}
```

`wrapperComponent` 未传时使用 `TinyCard`。通常无需直接调用，将它作为 `generateSkillFiles()` 的 `formatSkillBody` 传入即可。

### resolveSkillBodyFormatter()

按名称获取内置 formatter。

```typescript
function resolveSkillBodyFormatter(name: string): SkillBodyFormatter

type SkillBodyFormatter = (
  sectionMarkers: IPromptSectionMarker[],
  context: ISkillBodyContext,
) => string
```

当前仅内置 `genui-schema-json`。未知名称会抛出错误。`SKILL_BODY_FORMATTERS` 导出完整的 formatter 注册表。

## CLI

包同时提供 `genui-skill-generate` 命令：

```bash
npx @opentiny/genui-sdk-skill-generator

npx @opentiny/genui-sdk-skill-generator --out ./skills/my-skill

npx @opentiny/genui-sdk-skill-generator --config ./genui-skill.config.json
```

### runSkillGenerateCli()

读取 JSON 配置、动态导入物料模块并生成 Skill，是 CLI 的编程式入口。

```typescript
function runSkillGenerateCli(
  configPath: string,
  options?: ISkillGenerateCliOptions,
): Promise<void>

interface ISkillGenerateCliOptions {
  outputBaseDir?: string;
  skillDirs?: string[];
}
```

相对路径形式的 `materialsMetaModule` 始终相对配置文件目录解析。`outputBaseDir` 只改变 `skillDirs` 的解析基准；`skillDirs` 可覆盖配置文件中的输出目录。

```typescript
import { runSkillGenerateCli } from '@opentiny/genui-sdk-skill-generator';

await runSkillGenerateCli('./genui-skill.config.json', {
  skillDirs: ['./skills/my-skill'],
  outputBaseDir: process.cwd(),
});
```

### ISkillGenerateConfig

```typescript
interface ISkillGenerateConfig {
  framework?: IGenPromptFramework | IGenPromptFrameworkConfig;
  materialsMetaModule: string;
  materialsMetaExport?: string;
  skillDirs: string[];
  promptCustomConfig?: IGenPromptCustomConfig;
  tgCustomConfig?: IGenPromptCustomConfig;
  promptOptions?: IGenPromptOptions;
  skillBodyFormatter?: string;
  referenceSubdir?: string;
  syncComponentsIndex?: boolean;
  prune?: boolean;
  flatPrompt?: boolean;
}
```

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `framework` | `'vue'` | 框架名或自定义框架规则 |
| `materialsMetaModule` | — | 导出物料元数据的 ESM 模块路径或包名 |
| `materialsMetaExport` | `'materialsMeta'` | 物料模块的具名导出 |
| `skillDirs` | — | 一个或多个 Skill 输出目录 |
| `promptCustomConfig` | `{}` | 传给 `genPrompt` 的自定义组件、Snippet、示例和 Action |
| `skillBodyFormatter` | — | 内置 formatter 名称，目前支持 `genui-schema-json` |
| `referenceSubdir` | `'generated'` | `reference/` 下的生成内容子目录 |
| `syncComponentsIndex` | `true` | 是否同步按类型分组的组件白名单索引 |
| `prune` | `true` | 是否清理当前生成目录中的过期文件 |
| `flatPrompt` | `false` | 是否将完整 Prompt 直接写入 `SKILL.md` |

`referenceSubdir` 必须是安全的相对路径，且不能使用手写目录 `components`、`examples` 或它们的子路径。若传空字符串，必须同时设置 `prune: false`；此时生成分片会直接占用 `reference/` 下的路径（包括 `reference/components.md`），因此不会保留已有的手写组件索引。

### 其他 CLI API

| API | 类型 | 说明 |
|-----|------|------|
| `loadSkillGenerateConfig` | `(configPath: string) => { config: ISkillGenerateConfig; configDir: string }` | 读取并校验 JSON 配置中的必填项 |
| `parseSkillGenerateArgs` | `(args: string[], context: { defaultConfigPath: string; cwd?: string }) => IParsedSkillGenerateArgs` | 解析 `--config`、`--out`、`--help` 和兼容的位置参数 |
| `resolveConfiguredSkillDirs` | `(config, baseDir, overrideSkillDirs?) => string[]` | 将配置或覆盖项中的输出目录解析为绝对路径 |
| `resolveConfigPath` | `(configDir: string, targetPath: string) => string` | 将配置中的路径解析为绝对路径 |
| `createSkillGenerateUsage` | `(commandName?: string) => string` | 生成 CLI 帮助文本 |

```typescript
interface IParsedSkillGenerateArgs {
  configPath: string;
  options: ISkillGenerateCliOptions;
  help: boolean;
}
```

## 类型

### IGenerateSkillOptions

```typescript
interface IGenerateSkillOptions {
  skillDirs: string[];
  promptCustomConfig?: IGenPromptCustomConfig;
  tgCustomConfig?: IGenPromptCustomConfig;
  promptOptions?: IGenPromptOptions;
  formatSkillBody?: SkillBodyFormatter;
  referenceSubdir?: string;
  syncComponentsIndex?: boolean;
  prune?: boolean;
  defaultFrontmatter?: string;
  flatPrompt?: boolean;
}
```

| 选项 | 默认值 | 说明 |
|------|--------|------|
| `skillDirs` | — | 输出目录列表，不能为空；首个目录的 frontmatter 会复用于所有目录 |
| `promptCustomConfig` | — | 传给 core `genPrompt` 的自定义配置 |
| `promptOptions` | `{ isSkill: true }` | 控制 Prompt 章节；未显式设置时仅补上 `isSkill: true` |
| `formatSkillBody` | — | 在原始 Prompt 前缀后追加正文的 formatter |
| `referenceSubdir` | `'generated'` | 生成分片在 `reference/` 下的安全相对目录；空模式直接占用分片路径，包括 `reference/components.md` |
| `syncComponentsIndex` | `true` | 是否维护手写层的 `reference/components.md` 索引 |
| `prune` | `true` | 是否清理当前生成目录内的过期文件，不会跨目录清理 |
| `defaultFrontmatter` | 内置 `genui-schema-json` frontmatter | 首个目录没有 `SKILL.md` 时使用的 YAML frontmatter |
| `flatPrompt` | `false` | 跳过分片、formatter 与组件索引，直接写入完整 Prompt |

`IGenPromptCustomConfig`、`IGenPromptOptions`、`IMaterialsMeta` 等 core 类型见 [Core API 文档](../core/api)。

### IGenerateSkillResult

```typescript
interface IGenSkillContent {
  prompt: string;
  skillPrefix: string;
  sections: SkillSections;
  sectionMarkers: IPromptSectionMarker[];
}

interface IGenerateSkillResult extends IGenSkillContent {
  skillDirs: string[];
}

type SkillSections = Record<string, string>;

interface IPromptSectionMarker {
  marker: string;
  title: string;
  file: string;
  index: number;
}
```

`skillPrefix` 是首个 `##` 章节前、写入 `SKILL.md` 的原始 Prompt 内容；`sections` 的键是生成的 Markdown 文件名。

### 组件分类类型

```typescript
type ComponentCategoryId =
  | 'basic'
  | 'layout'
  | 'forms'
  | 'data-display'
  | 'charts'
  | 'other';

interface IComponentCategoryGroup {
  id: ComponentCategoryId;
  label: string;
  components: string[];
  detailRelPath?: string;
}

interface IGroupComponentsOptions {
  materials?: IMaterialsProtocol[];
  customComponents?: Array<{ component: string }>;
}

interface IComponentCategoryFile {
  id: ComponentCategoryId;
  file: string;
  label: string;
  content: string;
}
```

## 低层辅助 API

这些 API 适合自定义生成管线。一般场景优先使用 `generateSkillFiles()`。

### Prompt 拆分与校验

| API | 说明 |
|-----|------|
| `extractReferenceSections(prompt)` | 提取顶层 `##` 章节并分配不重复的 reference 文件名 |
| `extractSkillPrefix(prompt, markers)` | 提取首个 reference 章节前的 Prompt 前缀 |
| `splitPromptSections(prompt, markers)` | 按章节标记拆分 Prompt，返回文件名到原文的映射 |
| `assertPromptCoverage(prompt, prefix, sections, markers)` | 在内存中校验前缀与分片可逐字还原 Prompt |
| `assertWrittenPromptCoverage(skillDir, prompt, prefix, markers, referenceSubdir?)` | 从磁盘读取生成结果并校验可逐字还原 Prompt |
| `headingToReferenceFile(heading)` | 将章节标题转换为安全的 `.md` 文件名 |
| `assignReferenceFiles(markers)` | 为章节标记分配去重后的文件名 |
| `findSectionByTitle(markers, ...keywords)` | 不区分大小写查找首个标题匹配项 |
| `sectionLink(marker?, referenceSubdir?)` | 生成章节的 Markdown 链接；未传 marker 时返回空字符串 |
| `normalizeReferenceSubdir(referenceSubdir?)` | 规范化并校验生成子目录，默认返回 `generated` |

`SECTION_FILE_ALIASES` 同时导出，用于查询内置的章节标题到文件名映射。

### 文件写入

| API | 说明 |
|-----|------|
| `ensureSkillFrontmatter(skillSourceDir, defaultFrontmatter?)` | 读取 `SKILL.md` frontmatter；文件不存在时用默认值创建 |
| `writeReferenceFiles(skillDir, sections, options?)` | 写入无损分片、组件分类详情与组件索引；空子目录模式将 `components.md` 视为占用该路径的生成分片，而非需要保留的手写索引 |
| `writeSkillEntry(skillDirs, skillPrefix, markers, options?)` | 复用首个目录的 frontmatter，向一个或多个目录写入入口文件 |
| `removeStaleReferenceFiles(dir, sectionFiles)` | 删除目录中不在本次生成列表内的文件，但保留子目录 |

### 组件索引

| API | 说明 |
|-----|------|
| `parseWhitelistNames(whitelistText)` | 从反引号包裹的白名单文本中解析组件名 |
| `formatComponentList(names)` | 将组件名数组格式化为 Markdown 白名单 |
| `groupComponentsByCategory(whiteList, options?)` | 按名称启发式和物料分类信息对组件分组 |
| `extractComponentsWhitelist(detail)` | 从“可用组件”章节提取白名单文本 |
| `extractComponentsSchema(detail)` | 从“可用组件”章节提取 JSON Schema 数组，失败返回 `null` |
| `buildComponentCategoryFiles(detail, groups)` | 构建按类型拆分的组件 Markdown 文件内容 |
| `writeComponentCategoryFiles(outputDir, files, prune?)` | 写入分类详情文件，可清理过期文件 |
| `resolveHandwrittenCategoryLinks(skillDir)` | 收集已有的手写组件分类文档链接 |
| `buildComponentsIndex(whitelist, detailRelPath?, groups?, handwrittenLinks?)` | 生成按类型分组的 `components.md` 正文 |
| `syncComponentsIndex(skillDir, detail, detailRelPath?, groups?)` | 更新 `components.md` 受管区块；无受管标记时追加区块，旧版 `## 可用组件` 标题存在时替换该标题及其后全部内容 |

`COMPONENT_CATEGORY_DOCS` 导出内置分类的 id、文件名与标题元数据。

## 安全约束

- reference 文件名必须是当前目录中的 `.md` 文件，不能包含绝对路径、路径分隔符、控制字符或 Windows 保留名称。
- `referenceSubdir` 不能逃出 `reference/`，也不能指向手写的 `components/`、`examples/` 目录。
- `referenceSubdir` 为空时禁止启用 `prune`，避免删除手写 reference 文件。空模式会直接占用 `reference/` 下的生成分片路径，不会将 `reference/components.md` 作为手写索引保留。
- `syncComponentsIndex()` 会改写有效受管标记之间的内容；无标记时追加受管区块，旧版文件含 `## 可用组件` 标题时替换该标题及其后全部内容。受管标记缺少配对、重复或顺序错误，以及旧版白名单缺少必要标题等无效状态会被拒绝。
- formatter 只能追加到原始 Prompt 前缀之后；生成完成后会校验所有分片仍可逐字还原 `genPrompt` 输出。
