# @opentiny/genui-sdk-core


Core capabilities for GenUI SDK: protocol types, prompt generation, streaming schema extraction, delta patching, JSON repair, and more. Used by Vue / Angular / Server packages.

## Install

```bash
npm install @opentiny/genui-sdk-core
# or
pnpm add @opentiny/genui-sdk-core
```

## Exports

### Methods / Classes

| Export | Description |
|--------|-------------|
| `genPrompt` | Build system prompt from framework, materials meta, and custom config |
| `PatternExtractor` | Split streaming text into normal vs marked (`schemaJson`) segments |
| `SchemaJsonPattern` | Default pattern config for `` ```schemaJson `` blocks |
| `StreamPatternExtractor` | Stream wrapper around `PatternExtractor` |
| `getPartialStartRegString` | Build partial-match regex string for stream start flags |
| `DeltaPatcher` | Apply incremental JSON patches with field buffering |
| `matchJsonPath` | Match a JSON path against a CSS-like selector |
| `jsonSelectorMatcher` | Match delta path against buffered field selectors |
| `repairJson` / `safeJsonParse` | Parse or repair incomplete / invalid JSON |
| `buildMaterialDefaultValueMap` | Extract default props map from materials meta |

### Types

| Export | Description |
|--------|-------------|
| `IChatMessage` / `IMessageItem` | Chat message and stream message item shapes |
| `CardSchema` / `NodeSchema` / `Node` | Protocol schema tree types |
| `IMaterials` / `IMaterialsMeta` | Runtime materials vs prompt materials meta |
| `IGenPromptCustomConfig` / `IGenPromptOptions` | `genPrompt` config and options |
| `IPatchOptions` | `DeltaPatcher` options |
| `RepairJsonState` | Result state enum for `repairJson` |

## Usage

```ts
import {
  genPrompt,
  PatternExtractor,
  DeltaPatcher,
  repairJson,
  type IChatMessage,
} from '@opentiny/genui-sdk-core';
import { materialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';

const prompt = genPrompt('Vue', materialsMeta, customConfig);
const { state, value } = repairJson(partialJson);
```

## Docs

- [GenUI SDK](https://opentiny.design/genui-sdk)
- [Quick Start](https://docs.opentiny.design/genui-sdk/guide/quick-start)
- [Core API Reference](https://docs.opentiny.design/genui-sdk/components/core/api)
