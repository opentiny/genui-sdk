# @opentiny/genui-sdk-materials-vue-opentiny-vue-mobile

A GenUI Vue materials package based on TinyVue's **mobile-first** mode. Component names and props stay identical to the PC materials package.

## Install

```bash
npm install @opentiny/genui-sdk-materials-vue-opentiny-vue-mobile @opentiny/genui-sdk-vue @opentiny/genui-sdk-core
```

## Quick Start

```ts
import { GenuiConfigProvider, GenuiChat } from '@opentiny/genui-sdk-vue';
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue-mobile/materials';
```

```vue
<GenuiConfigProvider :materials="materials">
  <GenuiChat />
</GenuiConfigProvider>
```

## Enabling Mobile-First

TinyVue components choose between the `pc` and `mobile-first` templates via `inject('TinyMode')`. The materials declare `mode: 'mobile-first'`; `GenuiRenderer` reads that field from the injected materials and provides `TinyMode` to its render subtree. Injecting the materials into `GenuiConfigProvider` is therefore all that is required.

The injection happens in the renderer rather than the provider so that host UI outside the rendered schema (for example the `GenuiChat` sender built on the PC `TinyInput`) is not switched to mobile-first.

`mode` accepts `'pc' | 'mobile-first'`. TinyVue's legacy `mobile` mode is not supported: no `@opentiny/vue-*` 3.31 package ships a `mobile` template.

## Styles

The package imports `@opentiny/vue-runtime/dist3/tailwind.css`, which provides the Tailwind utility classes used by TinyVue's mobile-first templates. No extra styles are needed. Note that this CSS is global (it includes Tailwind preflight); load it on demand if PC materials are also used in the same application.

In the standalone `@opentiny/vue-common@3.31.0` build, `customDesignConfig.twMerge` is a no-op that returns an empty string. The mobile-first templates route all dynamic class names through it, so without a replacement components lose every dynamic class (borderless inputs, oversized icons). `design-config.ts` at the materials entry overrides it with `tailwind-merge`, which is why `tailwind-merge` is a runtime dependency and must not be removed.

## Relationship to PC Materials

- The protocol is identical to the PC materials package (component names, props, whitelist format); components are imported directly from `@opentiny/vue-*`.
- The whitelist is narrowed to components that ship a `mobile-first` template in 3.31.
- Mobile-only components are additionally registered: `TinyActionSheet`, `TinyPullRefresh`, `TinyPopup`.

Because `TinyMode` applies to the whole render subtree, do not merge this package with the PC materials; switch packages per component library.

## Width Adaptation

TinyVue's mobile-first `TinyCard` has a fixed default width (`size-medium` → `w-96`, 384px), which overflows 360/390px phones and causes horizontal scrolling. The materials set `TinyCard.auto-width = true` in `defaultPropsMap` so cards follow their container; an explicit `auto-width` value from the model still wins.

The other common components (forms, selects, tabs, carousel, pager, collapse, etc.) were checked at 360/390px widths with no horizontal overflow.

## Build

```bash
pnpm --filter @opentiny/genui-sdk-materials-vue-opentiny-vue-mobile build
```
