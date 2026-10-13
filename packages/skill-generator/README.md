# @opentiny/genui-sdk-skill-generator

Generate Agent skills (Cursor / Claude Code, etc.) from `genPrompt(framework, materialsMeta, …, { isSkill: true })` output.

## Layer Model

```
skills/<name>/
├── SKILL.md                      # Entry: genPrompt prefix + output format / workflow / type index (links only to existing files)
└── reference/
    ├── quick-ref.md              # Handwritten: high-frequency conventions quick reference (linked only if exists)
    ├── rules.md                  # Handwritten: generation constraint supplements; falls back to generated/rules.md
    ├── editing.md                # Handwritten: supplementary reading when modifying existing cards
    ├── common-mistakes.md        # Handwritten: common mistakes
    ├── this-context.md           # Handwritten: this / event supplements; falls back to generated
    ├── examples.md               # Handwritten: card example supplements; falls back to generated
    ├── examples/
    │   └── login-form.md         # Handwritten: full card examples like login forms
    ├── components.md             # Generator writes: componentName allowlist index grouped by type
    ├── components/               # Optional categorized handwritten docs (linked under corresponding type heading)
    │   ├── basic.md              # Handwritten: basic element supplements
    │   ├── forms.md              # Handwritten: form component supplements
    │   └── …
    └── generated/                # Generated layer (overwritable, synced with genPrompt)
        ├── components.md         # Full component dump, only used for genPrompt restoration, not a reading entry
        ├── components/           # Props / events split by type (Agent reads on demand)
        │   ├── basic.md          # Basic elements (a, Text, TinyIcon, etc.)
        │   ├── layout.md         # Layout components (TinyCard, etc.)
        │   ├── forms.md          # Form components (TinyForm, TinyInput, etc.)
        │   ├── data-display.md   # Data display (TinyGrid, TinyPager)
        │   ├── charts.md         # Chart components (TinyHuicharts*)
        │   └── …                 # Uncategorized items go to other.md
        ├── json-schema.md        # Card node JSON Schema: fields, allowlist enum, JSExpression / JSFunction / JSSlot
        ├── examples.md           # Full card examples (form two-way binding, info display, etc.)
        ├── schema-snippets.md    # Reusable node snippets (single-component props samples)
        ├── rules.md              # schemaJson generation rules (Page root, state/methods, no mock, etc.)
        ├── this-context.md       # this.state / this.methods / this.callAction usage
        └── actions.md            # Custom action definitions (generated when customActions is provided)
```

- **Handwritten layer**: supplementary explanations, small footprint, clear semantics; maintained manually, the generator does not scaffold
- **Generated layer**: full material dump and component details split by type; the generator only writes here
- **Type index**: `components.md` is grouped by the generator (forms / charts / data display, etc.) and linked to `generated/components/<type>.md`
- **Linking strategy**: workflow / handwritten supplementary links are "only linked if they exist"; `json-schema` / `rules` / `examples` / `this-context` fall back to the `generated/` same-name file when handwritten ones are missing; component props link to split files preferentially, not the full `generated/components.md`

## genPrompt Consistency

- `SKILL.md` always preserves the `genPrompt` H1 heading prefix verbatim; the formatter only appends workflow and type index after it
- `reference/generated/*.md` are lossless splits of the original `##` sections, no formatting or line break changes
- Except for `isSkill=true`, the generator does not override `genPrompt`'s default section toggles; JSON Schema is retained by default, and Actions are generated when `customActions` is provided
- After generation, the entry prefix and all splits are re-read from disk; it errors out if the original `genPrompt` cannot be restored verbatim
- `prune` is forbidden when `referenceSubdir` is empty, to avoid cleaning handwritten reference files
- `referenceSubdir` must not be `components` / `examples` (or their subpaths), to prevent default prune from deleting supplement docs like `forms.md`

## Installation

```bash
pnpm add @opentiny/genui-sdk-skill-generator
```

The package includes OpenTiny Vue materials by default. To use custom materials, provide your own
`materialsMetaModule` in the configuration (e.g. `@opentiny/genui-sdk-materials-vue-opentiny-vue/meta`).

## Programmatic API

```typescript
import {
  buildGenuiSchemaSkillBody,
  generateSkillFiles,
} from '@opentiny/genui-sdk-skill-generator';
import { materialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';

generateSkillFiles('vue', materialsMeta, {
  skillDirs: ['/path/to/skills/genui-schema-json'],
  formatSkillBody: buildGenuiSchemaSkillBody,
  referenceSubdir: 'generated', // default
  syncComponentsIndex: true,    // default: sync allowlist to handwritten components.md
});
```

## CLI

```bash
npx @opentiny/genui-sdk-skill-generator
```

Without a config file, it uses the built-in default configuration and generates skills into `skills/genui-schema-json` under the current working directory.

Specify an output directory:

```bash
npx @opentiny/genui-sdk-skill-generator --out ./skills/my-skill
```

To customize materials, output directory, or Actions, pass a config file:

```bash
npx @opentiny/genui-sdk-skill-generator --config path/to/config.json
```

The repo's default config is at [`config.json`](./config.json), aligned with the Playground standard mode,
using the full Vue material set and built-in `continueChat` / `saveState` Actions. When a config file is
explicitly passed, `skillDirs` and relative-path `materialsMetaModule` are resolved relative to the config
file's directory. `--out` is always resolved relative to the current working directory and overrides the
config's `skillDirs`. When calling `runSkillGenerateCli` programmatically, `outputBaseDir` only affects the
output directory, not material module resolution.

Legacy positional argument syntax is also supported:

```bash
npx @opentiny/genui-sdk-skill-generator path/to/config.json
```

## CLI Configuration Reference

`skillDirs` and relative-path `materialsMetaModule` in the config are resolved relative to the config file's directory.
`--out` is always resolved relative to the current working directory and overrides the config's `skillDirs`.
When calling `runSkillGenerateCli` programmatically, `outputBaseDir` only affects the output directory,
not material module resolution.

| Config | Type | Required / Default | Description |
| --- | --- | --- | --- |
| `framework` | `string \| { rules?: string[] }` | No, `"vue"` | Framework rules. Built-in: `vue`, `angular`, `react`; unknown strings fall back to Vue; you can also pass `{ rules }` for custom framework rules. |
| `materialsMetaModule` | `string` | Yes | ESM module path to the material metadata export (e.g. a built material package's `dist/meta.js`). Must be dynamically importable by Node before generation. |
| `materialsMetaExport` | `string` | No, `"materialsMeta"` | Named export name from the materials module. |
| `skillDirs` | `string[]` | Yes | Skill output directories. Sections are written to each directory; the `SKILL.md` frontmatter from the first directory is reused for all directories. |
| `skillBodyFormatter` | `string` | No | `SKILL.md` additional body formatter. Currently built-in: `genui-schema-json`; only appends workflow and type index, does not replace the original `genPrompt` prefix. The root wrapper component name is dynamically read from `materialsMeta.wrapperComponent` — no manual configuration needed. |
| `referenceSubdir` | `string` | No, `"generated"` | Subdirectory for generated sections under `reference/`. Keeping it independent is recommended to avoid overwriting handwritten docs. Must not use handwritten directory names `components` or `examples`. |
| `syncComponentsIndex` | `boolean` | No, `true` | Sync the type-grouped allowlist to `reference/components.md`. Skipped when subdirectories are empty to preserve prompt integrity. |
| `prune` | `boolean` | No, `true` | Delete old files in the generated subdirectory that were not produced in the current run. Must be `false` when `referenceSubdir` is empty. |
| `flatPrompt` | `boolean` | No, `false` | Skip reference section splitting and writing; write the full prompt directly as `SKILL.md` body (no `reference/` directory). Useful for scenarios that do not need split references. |
| `promptCustomConfig` | `object` | No, `{}` | Custom components, snippets, examples, and Actions passed through to core `genPrompt`. |
| `promptOptions` | `object` | No | Controls core prompt sections. The generator only sets `isSkill=true` by default; other values follow core defaults. |

Recommended configuration:

```json
{
  "referenceSubdir": "generated",
  "syncComponentsIndex": true,
  "prune": true
}
```

### promptCustomConfig

| Field | Content Structure | Generation Effect |
| --- | --- | --- |
| `customComponents` | `{ component, name?, description?, schema }[]` | Component names added to the allowlist; property, event, and slot descriptions written to `components.md`. `schema.properties` supports `property`, `description`, `type`, `required`, `defaultValue`, nested `properties`; `schema.events` supports `event`, `description`, `functionInfo`. |
| `customSnippets` | `NodeSchema[]` | Merged into `schema-snippets.md`. Nodes typically include `componentName`, `props`, `children`, and also support `slot`, `loop`, `loopArgs`, `condition`. |
| `customExamples` | `{ id?, name, description?, schema }[]` | Full card examples merged into `examples.md`; `schema` should use `Page` root node and include `state`, `methods`, `children`. |
| `customActions` | `{ name, description?, parameters?, return?, async? }[]` | Generates `actions.md` when defined and `includeActions` is not disabled. `parameters` and `return` use JSON Schema; `async=true` means `this.callAction` returns a Promise. |

`continueChat` and `saveState` are special Action names recognized by core, which additionally generates continue-chat and state-persistence rules. The configuration only describes components and Actions to the model; runtime component registration and Action execution functions still need to be provided by the application.

### promptOptions

| Config | Default | Description |
| --- | --- | --- |
| `isSkill` | `true` | Uses the Skill prefix and no-mock-data-without-evidence rule; generally should not be set to `false`. |
| `includeJsonSchema` | `true` | Generate full `json-schema.md`. |
| `includeSnippets` | `true` | Generate `schema-snippets.md` including material and custom snippets. |
| `includeExamples` | `true` | Generate `examples.md` including material and custom examples. |
| `includeActions` | `true` | Allow Action section generation; `actions.md` is still not produced without `customActions`. |
| `includeAboutThis` | `true` | Generate `this-context.md`. |
| `includeBaseRules` | `true` | Include core base rules; when disabled, mode rules, material rules, framework rules, and custom `rules` are still retained. |
| `rules` | `[]` | Append project-specific rules. Merge order: material rules, framework rules, project rules. |

A fully runnable config is at [`config.json`](./config.json). To integrate custom components, snippets, examples, or Actions,
add them to `promptCustomConfig` following the field descriptions above.

For Angular NG materials, set `framework` to `"angular"`, point `materialsMetaModule` at the
Angular material package, and the formatter automatically uses `TiCard` as the root wrapper
component. A complete example configuration:

```json
{
  "framework": "angular",
  "materialsMetaModule": "path/to/angular-opentiny-ng/dist/meta.js",
  "materialsMetaExport": "materialsMeta",
  "skillDirs": ["./skills/genui-schema-json-ng"],
  "skillBodyFormatter": "genui-schema-json",
  "referenceSubdir": "generated",
  "syncComponentsIndex": true,
  "prune": true,
  "promptCustomConfig": {
    "customActions": [
      {
        "name": "continueChat",
        "description": "继续对话，用于表单的提交按钮等",
        "parameters": {
          "type": "object",
          "properties": {
            "message": {
              "type": "string",
              "description": "对话消息，可以是按钮文本等，也可以是其他内容"
            }
          }
        }
      },
      {
        "name": "saveState",
        "description": "保存状态，用于保存组件状态",
        "parameters": {
          "type": "null"
        }
      }
    ]
  },
  "promptOptions": {
    "isSkill": true
  }
}
```

```bash
npx @opentiny/genui-sdk-skill-generator --config path/to/config.ng.json
```

## Repository Maintenance

```bash
pnpm --filter @opentiny/genui-sdk-skill-generator generate:skill
```

This writes the skill to the local [`example/genui-schema-json`](./example/genui-schema-json) directory
for CLI output comparison. This directory is generated by the tool and not committed to git.

After changing `referenceSubdir`, manually clean up the old generated directory; `prune` only cleans
outdated files in the current generated subdirectory, not across directories.

To verify: run `pnpm --filter @opentiny/genui-sdk-skill-generator test`, which automatically builds
core and Vue material dependencies before running tests.

`tgCustomConfig` is retained as a compatibility alias; when both are provided, `promptCustomConfig` takes precedence.