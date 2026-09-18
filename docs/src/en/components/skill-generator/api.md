# API Reference

`@opentiny/genui-sdk-skill-generator` converts the complete Prompt produced by `genPrompt` into `SKILL.md` and `reference/` fragments that agents such as Cursor and Claude Code can load on demand.

## Installation

```bash
pnpm add @opentiny/genui-sdk-skill-generator
```

## Core API

### generateSkillFiles()

Creates Skill files from a framework, material metadata, and generation options. This is the recommended entry point for programmatic use.

- **Type**

```typescript
function generateSkillFiles(
  framework: IGenPromptFramework | IGenPromptFrameworkConfig,
  materialsMeta: IMaterialsMeta,
  options: IGenerateSkillOptions,
): IGenerateSkillResult
```

- **Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `framework` | `IGenPromptFramework \| IGenPromptFrameworkConfig` | Yes | Framework name such as `'vue'`, `'angular'`, or `'react'`, or custom framework rules |
| `materialsMeta` | `IMaterialsMeta` | Yes | Material metadata, usually imported from a material package's `meta` entry |
| `options` | [`IGenerateSkillOptions`](#igenerateskilloptions) | Yes | Output directories, Prompt configuration, fragment strategy, and formatter |

- **Return value**

Returns [`IGenerateSkillResult`](#igenerateskillresult), which contains the complete Prompt, split result, and resolved output directories. This function is synchronous and throws immediately when writing or validation fails.

- **Details**

By default, generation performs these steps:

1. Calls `genPrompt` from the core package with `isSkill` enabled by default.
2. Losslessly splits Prompt sections headed by `##` into `reference/generated/`.
3. Creates component detail files by category and synchronizes the allowlist index in `reference/components.md`.
4. Preserves YAML frontmatter from the first output directory's existing `SKILL.md`, then writes every output directory.
5. Reads the generated files from disk and verifies that they reconstruct the original Prompt byte for byte.

With `flatPrompt: true`, the complete Prompt is written directly to `SKILL.md`; no `reference/` fragments are created and `formatSkillBody` is not called.

- **Example**

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

Generates and splits Skill content without performing file IO. Use it to preview generation or integrate a custom storage layer.

- **Type**

```typescript
function genSkillContent(
  framework: IGenPromptFramework | IGenPromptFrameworkConfig,
  materialsMeta: IMaterialsMeta,
  tgCustomConfig?: IGenPromptCustomConfig,
  promptOptions?: IGenPromptOptions,
  options?: { flatPrompt?: boolean },
): IGenSkillContent
```

When `promptOptions.isSkill` is omitted, it is set to `true`. With `flatPrompt` enabled, `skillPrefix` equals the complete `prompt`, while `sections` and `sectionMarkers` are empty.

```typescript
import { genSkillContent } from '@opentiny/genui-sdk-skill-generator';
import { materialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';

const { skillPrefix, sections, sectionMarkers } = genSkillContent(
  'vue',
  materialsMeta,
);
```

### buildGenuiSchemaSkillBody()

Builds the agent-friendly body for the built-in `genui-schema-json` Skill, including output rules, an on-demand reading workflow, the component category index, and a generated-file catalog. It links only to files that exist in the current Skill directory.

- **Type**

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

When `wrapperComponent` is omitted, it defaults to `TinyCard`. Normally, pass this function as `formatSkillBody` to `generateSkillFiles()` instead of calling it directly.

### resolveSkillBodyFormatter()

Returns a built-in formatter by name.

```typescript
function resolveSkillBodyFormatter(name: string): SkillBodyFormatter

type SkillBodyFormatter = (
  sectionMarkers: IPromptSectionMarker[],
  context: ISkillBodyContext,
) => string
```

The only built-in formatter is currently `genui-schema-json`. An unknown name throws an error. `SKILL_BODY_FORMATTERS` exports the complete formatter registry.

## CLI

The package also provides the `genui-skill-generate` command:

```bash
npx @opentiny/genui-sdk-skill-generator

npx @opentiny/genui-sdk-skill-generator --out ./skills/my-skill

npx @opentiny/genui-sdk-skill-generator --config ./genui-skill.config.json
```

### runSkillGenerateCli()

Reads a JSON config, dynamically imports the material module, and generates the Skill. This is the programmatic entry point for the CLI workflow.

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

A relative `materialsMetaModule` is always resolved from the config file's directory. `outputBaseDir` only changes the base used to resolve `skillDirs`; `skillDirs` overrides the output directories declared in the config.

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

| Property | Default | Description |
|----------|---------|-------------|
| `framework` | `'vue'` | Framework name or custom framework rules |
| `materialsMetaModule` | — | ESM module path or package name that exports material metadata |
| `materialsMetaExport` | `'materialsMeta'` | Named export to read from the material module |
| `skillDirs` | — | One or more Skill output directories |
| `promptCustomConfig` | `{}` | Custom components, snippets, examples, and Actions passed to `genPrompt` |
| `skillBodyFormatter` | — | Built-in formatter name; currently supports `genui-schema-json` |
| `referenceSubdir` | `'generated'` | Generated-content subdirectory under `reference/` |
| `syncComponentsIndex` | `true` | Whether to synchronize the categorized component allowlist index |
| `prune` | `true` | Whether to remove stale files from the current generated directory |
| `flatPrompt` | `false` | Whether to write the complete Prompt directly to `SKILL.md` |

`referenceSubdir` must be a safe relative path and cannot use the handwritten `components` or `examples` directories or their descendants. If it is an empty string, `prune` must also be `false`.

### Other CLI APIs

| API | Type | Description |
|-----|------|-------------|
| `loadSkillGenerateConfig` | `(configPath: string) => { config: ISkillGenerateConfig; configDir: string }` | Reads a JSON config and validates its required properties |
| `parseSkillGenerateArgs` | `(args: string[], context: { defaultConfigPath: string; cwd?: string }) => IParsedSkillGenerateArgs` | Parses `--config`, `--out`, `--help`, and the compatible positional argument |
| `resolveConfiguredSkillDirs` | `(config, baseDir, overrideSkillDirs?) => string[]` | Resolves output directories from the config or override to absolute paths |
| `resolveConfigPath` | `(configDir: string, targetPath: string) => string` | Resolves a configured path to an absolute path |
| `createSkillGenerateUsage` | `(commandName?: string) => string` | Creates CLI usage text |

```typescript
interface IParsedSkillGenerateArgs {
  configPath: string;
  options: ISkillGenerateCliOptions;
  help: boolean;
}
```

## Types

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

| Option | Default | Description |
|--------|---------|-------------|
| `skillDirs` | — | Non-empty list of output directories; frontmatter from the first directory is reused by every directory |
| `promptCustomConfig` | — | Custom configuration passed to core `genPrompt` |
| `promptOptions` | `{ isSkill: true }` | Controls Prompt sections; only `isSkill: true` is added when not explicitly set |
| `formatSkillBody` | — | Formatter that appends content after the original Prompt prefix |
| `referenceSubdir` | `'generated'` | Safe relative directory under `reference/` for generated fragments |
| `syncComponentsIndex` | `true` | Whether to maintain the handwritten-layer `reference/components.md` index |
| `prune` | `true` | Whether to remove stale files in the current generated directory; it never cleans across directories |
| `defaultFrontmatter` | Built-in `genui-schema-json` frontmatter | YAML frontmatter used when the first directory has no `SKILL.md` |
| `flatPrompt` | `false` | Skips fragments, the formatter, and component indexing, and writes the complete Prompt |

See the [Core API reference](../core/api) for core types such as `IGenPromptCustomConfig`, `IGenPromptOptions`, and `IMaterialsMeta`.

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

`skillPrefix` is the original Prompt content before the first `##` section and is written to `SKILL.md`; keys in `sections` are generated Markdown filenames.

### Component category types

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

## Low-level helper APIs

Use these APIs to build a custom generation pipeline. Prefer `generateSkillFiles()` for typical usage.

### Prompt splitting and validation

| API | Description |
|-----|-------------|
| `extractReferenceSections(prompt)` | Extracts top-level `##` sections and assigns unique reference filenames |
| `extractSkillPrefix(prompt, markers)` | Extracts the Prompt prefix before the first reference section |
| `splitPromptSections(prompt, markers)` | Splits the Prompt by section markers into a filename-to-source map |
| `assertPromptCoverage(prompt, prefix, sections, markers)` | Verifies in memory that the prefix and fragments reconstruct the Prompt byte for byte |
| `assertWrittenPromptCoverage(skillDir, prompt, prefix, markers, referenceSubdir?)` | Reads generated files from disk and verifies byte-for-byte Prompt reconstruction |
| `headingToReferenceFile(heading)` | Converts a section heading into a safe `.md` filename |
| `assignReferenceFiles(markers)` | Assigns deduplicated filenames to section markers |
| `findSectionByTitle(markers, ...keywords)` | Finds the first title matching a keyword, case-insensitively |
| `sectionLink(marker?, referenceSubdir?)` | Creates a Markdown link for a section, or an empty string when no marker is provided |
| `normalizeReferenceSubdir(referenceSubdir?)` | Normalizes and validates the generated subdirectory; defaults to `generated` |

`SECTION_FILE_ALIASES` is also exported for inspecting the built-in section-heading-to-filename mapping.

### File writing

| API | Description |
|-----|-------------|
| `ensureSkillFrontmatter(skillSourceDir, defaultFrontmatter?)` | Reads `SKILL.md` frontmatter, creating the file from the default when it does not exist |
| `writeReferenceFiles(skillDir, sections, options?)` | Writes lossless fragments, component category details, and the component index |
| `writeSkillEntry(skillDirs, skillPrefix, markers, options?)` | Reuses frontmatter from the first directory and writes the entry file to one or more directories |
| `removeStaleReferenceFiles(dir, sectionFiles)` | Removes files absent from the current generation list while preserving subdirectories |

### Component indexing

| API | Description |
|-----|-------------|
| `parseWhitelistNames(whitelistText)` | Parses component names from a backtick-delimited allowlist |
| `formatComponentList(names)` | Formats component names as a Markdown allowlist |
| `groupComponentsByCategory(whiteList, options?)` | Groups components using name heuristics and material category metadata |
| `extractComponentsWhitelist(detail)` | Extracts allowlist text from the Available Components section |
| `extractComponentsSchema(detail)` | Extracts the JSON Schema array from the Available Components section, or returns `null` |
| `buildComponentCategoryFiles(detail, groups)` | Builds categorized component Markdown file content |
| `writeComponentCategoryFiles(outputDir, files, prune?)` | Writes categorized detail files and optionally removes stale files |
| `resolveHandwrittenCategoryLinks(skillDir)` | Collects links to existing handwritten component-category docs |
| `buildComponentsIndex(whitelist, detailRelPath?, groups?, handwrittenLinks?)` | Builds the categorized `components.md` body |
| `syncComponentsIndex(skillDir, detail, detailRelPath?, groups?)` | Updates the managed block in `components.md` while preserving handwritten content outside it |

`COMPONENT_CATEGORY_DOCS` exports the id, filename, and heading metadata for the built-in categories.

## Safety constraints

- Reference filenames must be `.md` files in the current directory and cannot contain absolute paths, path separators, control characters, or Windows reserved names.
- `referenceSubdir` cannot escape `reference/` or target the handwritten `components/` and `examples/` directories.
- `prune` is prohibited when `referenceSubdir` is empty to prevent deletion of handwritten reference files.
- `syncComponentsIndex()` only rewrites content between its managed markers; it refuses to overwrite files with missing, duplicated, or misordered markers.
- A formatter may only append after the original Prompt prefix. After generation, all fragments are checked to ensure that they still reconstruct the `genPrompt` output byte for byte.
