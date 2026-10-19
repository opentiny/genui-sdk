# GenUI SDK

<p align="center">
  <a href="https://opentiny.design/genui-sdk" target="_blank" rel="noopener noreferrer">
    <img alt="OpenTiny Logo" src="logo.svg" height="100" style="max-width:100%;">
  </a>
</p>

Language: English | [简体中文](README.zh-CN.md)

GenUI SDK is a full‑stack development toolkit developed by OpenTiny for building **Generative UI**–based AI applications. It helps you quickly create AI apps and embed generative interfaces into existing products.

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/opentiny/genui-sdk)

## Introduction

**GenUI SDK** is an open‑source solution built by the OpenTiny team around the Generative UI concept, providing integrated capabilities across both frontend and backend.  
It follows the OpenAI API specification, so you can connect to mainstream LLM providers out of the box.  
The SDK ships with Vue, Angular and React renderers, and supports custom component libraries, interaction logic, and theming.  
Whether you are building an AI chat application from scratch or adding generative UI capabilities into an existing business system, GenUI SDK is designed to be ready‑to‑use yet highly extensible.

## Try It Now

You can visit the [Playground](https://opentiny.github.io/genui-sdk/playground/) to experience Generative UI capabilities in action.  
The playground itself is built using GenUI SDK.

## Getting Started

If you want to use GenUI SDK in your own project, please refer to the
[Quick Start](https://docs.opentiny.design/genui-sdk/guide/quick-start.html) guide and the [Server package usage](https://docs.opentiny.design/genui-sdk/guide/server-usage.html) documentation.

## Packages

The repository publishes the following packages. They share the same schema protocol and materials system, and each frontend package provides framework-specific APIs.

| Layer         | Package                                                  | Framework   | Docs                                                                                  | Description                                                                                                             |
| ------------- | -------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Core          | [`@opentiny/genui-sdk-core`](packages/core/README.md)     | Agnostic    | [Docs](https://docs.opentiny.design/genui-sdk/components/core/api)                     | Protocol types, prompt generation, streaming Markdown and SchemaJson extraction, delta patching and JSON repair. Required by most other packages. |
| Frontend      | [`@opentiny/genui-sdk-vue`](packages/frameworks/vue/README.md) | Vue   | [Docs](https://docs.opentiny.design/genui-sdk/guide/quick-start)                       | `GenuiChat`, `GenuiRenderer`, `GenuiConfigProvider` and `generateCode` for Vue applications.                          |
| Frontend      | [`@opentiny/genui-sdk-angular`](packages/frameworks/angular/README.md) | Angular | [Docs](https://docs.opentiny.design/genui-sdk/guide/angular/install)             | `GenuiRenderer` and `GenuiConfigProvider` for Angular applications.                                           |
| Frontend      | [`@opentiny/genui-sdk-react`](packages/frameworks/react/README.md) | React | [Docs](https://docs.opentiny.design/genui-sdk/guide/react/install)                 | `GenuiRenderer` and `GenuiConfigProvider` for React applications.                                                 |
| Materials     | [`@opentiny/genui-sdk-materials-vue-opentiny-vue`](packages/materials/vue-opentiny-vue/README.md) | Vue | [Docs](https://docs.opentiny.design/genui-sdk/components/materials/vue-opentiny-vue) | Component map + prompt metadata based on [OpenTiny Vue](https://opentiny.design/tiny-vue/).         |
| Materials     | [`@opentiny/genui-sdk-materials-vue-element-plus`](packages/materials/vue-element-plus/README.md) | Vue | [Docs](https://docs.opentiny.design/genui-sdk/components/materials/vue-element-plus) | Component map + prompt metadata based on [Element Plus](https://element-plus.org/).                 |
| Materials     | [`@opentiny/genui-sdk-materials-angular-opentiny-ng`](packages/materials/angular-opentiny-ng/README.md) | Angular | [Docs](https://docs.opentiny.design/genui-sdk/components/materials/angular-opentiny-ng) | Component map + prompt metadata based on [OpenTiny NG](https://opentiny.design/tiny-ng/).       |
| Materials     | [`@opentiny/genui-sdk-materials-react-antd`](packages/materials/react-antd/README.md) | React | [Docs](https://docs.opentiny.design/genui-sdk/components/materials/react-antd) | Component map + prompt metadata based on [Ant Design](https://ant.design/).                         |
| Server        | [`@opentiny/genui-sdk-server`](packages/server/README.md) | Node.js    | [Docs](https://docs.opentiny.design/genui-sdk/guide/server-usage)                      | OpenAI‑compatible chat completions service that injects materials metadata and streams SchemaJson content.                  |
| AI tooling    | [`@opentiny/genui-sdk-skill-generator`](packages/skill-generator/README.md) | Node.js | [Docs](https://docs.opentiny.design/genui-sdk/components/skill-generator/api) | Generates Agent skills (Cursor / Claude Code, etc.) from `genPrompt` output.                                  |
| AI tooling    | [`@opentiny/genui-sdk-integration-skill`](packages/integrate/skill/genui-integration/README.md) | — | [Docs](https://docs.opentiny.design/genui-sdk/components/integration-skill/api) | Agent skill that guides AI assistants through GenUI SDK integration (Vue / Angular / React / Server).        |

Two rules make the packages fit together:

1. A renderer never bundles a component library — inject one **materials** package through `GenuiConfigProvider`.
2. The **server** must use the same materials metadata as the frontend, otherwise the LLM generates component names the frontend cannot render. See [Server](#server).

## Usage

### Core

Low‑level building blocks used by the frameworks and the server. Install it directly only when you build your own renderer, prompt pipeline or server integration.

```bash
npm install @opentiny/genui-sdk-core
```

```ts
import { genPrompt, repairJson } from '@opentiny/genui-sdk-core';
import { materialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';

// Build the system prompt from a framework + materials metadata.
const systemPrompt = genPrompt('Vue', materialsMeta, customConfig);

// Repair an incomplete streaming JSON payload.
const { state, value } = repairJson(partialJson);
```

It also exports `PatternExtractor` / `StreamPatternExtractor` (split streaming text into normal and `SchemaJson` segments), `DeltaPatcher` (apply incremental JSON patches) and the protocol types (`CardSchema`, `IChatMessage`, `IMaterials`, …).

See the [Core API reference](https://docs.opentiny.design/genui-sdk/components/core/api).

### Vue

```bash
pnpm add @opentiny/genui-sdk-vue @opentiny/genui-sdk-materials-vue-opentiny-vue
```

Use the all‑in‑one `GenuiChat`, or the lower‑level `GenuiRenderer` for a custom chat shell.

```vue
<script setup>
import { GenuiChat, GenuiConfigProvider } from '@opentiny/genui-sdk-vue';
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
</script>

<template>
  <GenuiConfigProvider theme="light" :materials="materials">
    <GenuiChat url="/api/chat" model="deepseek-chat" />
  </GenuiConfigProvider>
</template>
```

Import by feature through subpath exports to keep bundles small:

| Subpath                                      | Exports                                            |
| -------------------------------------------- | -------------------------------------------------- |
| `@opentiny/genui-sdk-vue`                    | Everything below                                   |
| `@opentiny/genui-sdk-vue/chat`               | `GenuiChat`                                        |
| `@opentiny/genui-sdk-vue/renderer`           | `GenuiRenderer`                                    |
| `@opentiny/genui-sdk-vue/config-provider`    | `GenuiConfigProvider`                              |
| `@opentiny/genui-sdk-vue/code-generator`     | `generateCode` (SchemaJson → Vue SFC)              |
| `@opentiny/genui-sdk-vue/legacy-chat`        | `GenuiLegacyChat` (bundled OpenTiny Vue materials) |

Docs: [Quick Start](https://docs.opentiny.design/genui-sdk/guide/quick-start.html) · [GenuiChat](https://docs.opentiny.design/genui-sdk/components/chat) · [GenuiRenderer](https://docs.opentiny.design/genui-sdk/components/renderer) · [generateCode](https://docs.opentiny.design/genui-sdk/components/code-generator).

### Angular

```bash
pnpm add @opentiny/genui-sdk-angular @opentiny/genui-sdk-materials-angular-opentiny-ng @opentiny/ng-themes
```

Import the theme styles, and make sure `zone.js` and animations are available (`polyfills: ["zone.js"]`, `provideAnimations()`):

```ts
import { Component } from '@angular/core';
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-angular';
import { materials } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/materials';

@Component({
  standalone: true,
  imports: [GenuiConfigProvider, GenuiRenderer],
  template: `
    <genui-config-provider [materials]="materials">
      <genui-renderer [content]="schemaJson" [state]="state" [generating]="isGenerating" />
    </genui-config-provider>
  `,
})
export class AppComponent {
  materials = materials;
  schemaJson = '{}';
  state: Record<string, any> = {};
  isGenerating = false;
}
```

`GenuiLegacyRenderer` is available for drop‑in compatibility with the bundled materials.

Docs: [Install](https://docs.opentiny.design/genui-sdk/guide/angular/install) · [GenuiRenderer](https://docs.opentiny.design/genui-sdk/components/angular/renderer).

### React

```bash
pnpm add @opentiny/genui-sdk-react @opentiny/genui-sdk-materials-react-antd antd
```

```tsx
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-react';
import { materials } from '@opentiny/genui-sdk-materials-react-antd/materials';
import 'antd/dist/reset.css';

export function App({ schemaJson }: { schemaJson: unknown }) {
  return (
    <GenuiConfigProvider materials={materials}>
      <GenuiRenderer content={schemaJson} isJsonComplete />
    </GenuiConfigProvider>
  );
}
```

Subpath exports: `@opentiny/genui-sdk-react/renderer` and `@opentiny/genui-sdk-react/config-provider`.

Docs: [Install](https://docs.opentiny.design/genui-sdk/guide/react/install) · [GenuiRenderer](https://docs.opentiny.design/genui-sdk/components/react/renderer).

### Materials

A materials package provides two things:

- `materials` — the runtime component map injected into `GenuiConfigProvider`, used by the renderer to resolve `componentName`.
- `materialsMeta` — prompt metadata (component descriptions, whitelist, examples, rules) passed to `genPrompt()` on the server.

| Package                                             | Base library  | Wrapper component | Exports                                                                              |
| --------------------------------------------------- | ------------- | ----------------- | ------------------------------------------------------------------------------------ |
| [`@opentiny/genui-sdk-materials-vue-opentiny-vue`](packages/materials/vue-opentiny-vue/README.md) | OpenTiny Vue | `TinyCard` | `materials` / `miniMaterials` / `plusMaterials`, `materialsMeta` / `miniMaterialsMeta` / `plusMaterialsMeta` |
| [`@opentiny/genui-sdk-materials-vue-element-plus`](packages/materials/vue-element-plus/README.md) | Element Plus | `ElCard` | `materials`, `materialsMeta` |
| [`@opentiny/genui-sdk-materials-angular-opentiny-ng`](packages/materials/angular-opentiny-ng/README.md) | OpenTiny NG | `TiCard` | `materials`, `materialsMeta` |
| [`@opentiny/genui-sdk-materials-react-antd`](packages/materials/react-antd/README.md) | Ant Design | `AntCard` | `materials`, `materialsMeta` |

The Vue OpenTiny materials ship in three tiers — `mini` (forms/info blocks), standard `materials` (data display, charts) and `plus` (full business pages: tree, dialog, timeline…). Both the frontend map and the server metadata have a matching tier.

```ts
// Frontend: inject the component map.
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
// import { plusMaterials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';

// Server: build the prompt from the matching metadata.
import { genPrompt } from '@opentiny/genui-sdk-core';
import { materialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';
const systemPrompt = genPrompt('Vue', materialsMeta, customConfig);
```

Replace the import path with the package matching your framework, and pass the framework name (`'Vue'`, `'Angular'`, `'React'`) to `genPrompt`.

Docs: [Vue OpenTiny Vue](https://docs.opentiny.design/genui-sdk/components/materials/vue-opentiny-vue) · [Vue Element Plus](https://docs.opentiny.design/genui-sdk/components/materials/vue-element-plus) · [Angular OpenTiny NG](https://docs.opentiny.design/genui-sdk/components/materials/angular-opentiny-ng) · [React Ant Design](https://docs.opentiny.design/genui-sdk/components/materials/react-antd).

### Server

OpenAI‑compatible chat completions service with streaming SchemaJson support. The CLI can only use the built‑in default materials (Vue → OpenTiny Vue, Angular → OpenTiny NG); when the frontend uses any other materials package, pass `materialsMeta` explicitly.

```bash
# .env
# BASE_URL=https://api.openai.com/v1
# API_KEY=your-api-key
# PORT=3100

npx genui-sdk-server            # default port 3100
npx genui-sdk-server -p 3000    # custom port
npx genui-sdk-server -e .env.production
```

Programmatic:

```ts
import { startServer, equipChatCompletions } from '@opentiny/genui-sdk-server';
import { materialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';

startServer({ port: 3100, baseURL: 'https://api.openai.com/v1', apiKey: '***', materialsMeta });

// Or mount onto an existing Express app:
const app = express();
equipChatCompletions(app, { route: '/api/chat', baseURL: '...', apiKey: '***', materialsMeta });
```

Docs: [Server usage](https://docs.opentiny.design/genui-sdk/guide/server-usage.html) · [Server API](https://docs.opentiny.design/genui-sdk/components/server/api).

### AI tooling

**Integration skill** — install it and point your AI assistant (any tool that supports the Skills convention) at the package's `SKILL.md`:

```bash
npm install @opentiny/genui-sdk-integration-skill
```

The skill answers questions such as “integrate GenUI SDK into a Vue project”, “how do I use `GenuiRenderer` in Angular?”, and “how do I set up genui-sdk-server?”.

**Skill generator** — generate your own project‑specific Agent skill from `genPrompt(framework, materialsMeta, …, { isSkill: true })` output:

```bash
npx @opentiny/genui-sdk-skill-generator --out ./skills/my-skill
npx @opentiny/genui-sdk-skill-generator --config path/to/config.json
```

```ts
import { generateSkillFiles, buildGenuiSchemaSkillBody } from '@opentiny/genui-sdk-skill-generator';
import { materialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';

generateSkillFiles('vue', materialsMeta, {
  skillDirs: ['/path/to/skills/genui-schema-json'],
  formatSkillBody: buildGenuiSchemaSkillBody,
});
```

Docs: [Skill Generator API](https://docs.opentiny.design/genui-sdk/components/skill-generator/api) · [Integration Skill](https://docs.opentiny.design/genui-sdk/components/integration-skill/api).

## Core Capabilities

GenUI SDK is designed to balance **out‑of‑the‑box experience** with **deep customization**, offering rich features and strong ecosystem compatibility:

| Feature                    | Description                                                                                                                                         |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI ecosystem compatibility | Follows the OpenAI API specification and can integrate mainstream LLM services. Supports MCP for extending tools and connecting external/enterprise systems. |
| Theme customization        | Supports theme switching, dark mode, and token‑based theming to adapt to different brand and product style guides.                                 |
| Custom components          | Extend the generative UI component library and incorporate business components into a unified generative interaction system.       |
| Custom interactions        | Allows flexible configuration of multi‑turn conversation flows and custom commands/actions (e.g., open page, fetch data, generate forms) to fit complex scenarios. |
| Multi‑stack support        | Bundles Vue, Angular and React renderers so you can adopt GenUI SDK in new projects or integrate it progressively into existing frontends.          |
| Advanced capabilities      | Offers sample projects and best‑practice templates. Combined with server‑side features, you can implement message orchestration, tool invocation, access control, and more. |

For more details, see the GenUI SDK [feature examples](https://docs.opentiny.design/genui-sdk/examples/renderer/custom-actions.html) for complete explanations and practical guides.

## Contributing

If you are interested in GenUI SDK, we welcome contributions.  
Before contributing, please read the [Contributing Guide](CONTRIBUTING.md).

You can also reach us via:

- Add the official WeChat assistant: `opentiny-official` to join the technical discussion group
- Join the mailing list: <opentiny@googlegroups.com>

## License

[MIT](https://opensource.org/license/MIT)
