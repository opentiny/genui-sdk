# Release Notes 示例

以下为 `v1.3.0`（对比 `v1.2.0`）的格式参考。

```markdown
# Genui SDK v1.3.0 Release Notes

## 🚀 Highlights

- **Core package release** - `@opentiny/genui-sdk-core` is now published to npm as a standalone package, exposing the protocols, prompt generation, stream schema extraction, delta patching, and JSON repair modules (#206).
- **Materials decoupling & new material packages** - materials are split into independently publishable packages, including the new `@opentiny/genui-sdk-materials-vue-element-plus` (#174) alongside the decoupled `vue-opentiny-vue` and `angular-opentiny-ng` material packages (#125, #206, #213).
- **Multi-framework rendering** - framework switching in the playground (#143), and mixin renderer support (#208).
- **A2A protocol v1.0** - added support for A2A protocol v1.0, with automatic fallback to 0.3 when a 1.0 invoke fails (#187, #219).
- **Lifecycle enhancements** - lifeCycles are now deferred until schema streaming completes (#182), backed by an explicit Zod schema (#194), with `onMounted`/`onUnmounted` support for the ng-renderer (#197).
- **Custom actions & refs** - custom actions now support return values and async (#184), plus a new refs feature (#183) and prompt variants (#202).
- **Default props apply** - unified across the Vue and Angular renderers (#149, #196, #218).
- **Internationalization** - playground and docs/site i18n with persisted locale settings (#172, #176, #189, #192).

---

## ✨ Features

**Components**
- feat: materials decoupling by @yy-wow in https://github.com/opentiny/genui-sdk/pull/125
- feat: add apply default props by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/149
- feat: add new vue-element-plus package by @lhuans in https://github.com/opentiny/genui-sdk/pull/174
- feat: defer lifeCycles until schema streaming is complete by @yy-wow in https://github.com/opentiny/genui-sdk/pull/182
- feat: add refs feature and form validate demo by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/183
- feat: add returns and async support to custom actions by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/184
- feat(core): add explicit Zod schema for lifeCycles hooks by @yy-wow in https://github.com/opentiny/genui-sdk/pull/194
- feat(genui-sdk-angular): add default props apply to angular renderer by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/196
- feat(ng-renderer): add page onMounted/onUnmounted lifecycle support by @yy-wow in https://github.com/opentiny/genui-sdk/pull/197
- feat: add prompt variants by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/202
- feat(genui-sdk-vue): add legacy components by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/209
- feat(genui-sdk-vue): materials support change value by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/214
- feat(genui-sdk-angular): add legacy component and update docs by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/215
- feat(core): add ICustomMessageItem type and optimize custom response handler by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/226

**Playground**
- feat(playground): support switch framework by @yy-wow in https://github.com/opentiny/genui-sdk/pull/143
- feat(playground): add OpenAPI-to-AI-SDK tools pipeline with service configuration UI by @gargameljyh in https://github.com/opentiny/genui-sdk/pull/175
- feat(playground): implement language switcher and add English translations by @lhuans in https://github.com/opentiny/genui-sdk/pull/176
- feat(playground): enhance chat template by adding extra body options by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/177
- feat(playground/template): add schema manual editing functionality and version history panel by @yy-wow in https://github.com/opentiny/genui-sdk/pull/185
- feat(playground): add support for A2A protocol v1.0 by @yy-wow in https://github.com/opentiny/genui-sdk/pull/187
- feat(playground): improve i18n and persist locale settings by @lhuans in https://github.com/opentiny/genui-sdk/pull/192
- feat(playground/server): add new MaaS models at dev mode by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/205
- feat(playground): allow mixin renderer by @rhlin in https://github.com/opentiny/genui-sdk/pull/208

---

## 🐛 Bug Fixes

**Components**
- fix: replace chart components with huicharts and add apply default props by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/94
- fix(genui-sdk-vue): set isJsonComplete default value to true by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/180
- fix: fix grid events dynamic change do not work by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/186
- fix(genui-sdk-vue): optimize notification event payload and toolcall result by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/190
- fix: delete useless defaultValue by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/203
- fix(genui-sdk-vue): move inject token to shared folder and export in ConfigProvider by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/211
- fix(genui-sdk-angular): apply default properties in attribute parsing by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/218
- fix(genui-sdk-vue): fix jsonrepair dependency and add export by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/223
- fix(playground, genui-sdk-angular): fix genui-renderer-ng-element style by @rhlin in https://github.com/opentiny/genui-sdk/pull/227
- fix(genui-sdk-vue): change image content type to openai by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/228
- fix(genui-sdk-vue): optimize assistant display for markdown-only scene by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/229
- fix(genui-sdk-vue): fix ref error when ref is empty object at streaming scene by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/232
- fix(core,materials): add eventName to prompt and optimize materials by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/233
- fix(core): add API rule and optimize prompt for params use by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/234

**Playground**
- fix(playground): only show prompt variants in vue framework by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/217
- fix(playground): fall back to A2A 0.3 when 1.0 invoke fails by @yy-wow in https://github.com/opentiny/genui-sdk/pull/219
- fix(playground): harden jsonPatch apply and component id assignment by @yy-wow in https://github.com/opentiny/genui-sdk/pull/222

---

## ♻️ Refactor

**Components**
- refactor(materials): restructure vue materials package and fix playground template preview by @yy-wow in https://github.com/opentiny/genui-sdk/pull/191
- refactor: add new packages and refactor export by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/206
- refactor(ng): decouple OpenTiny NG materials from schema renderer by @yy-wow in https://github.com/opentiny/genui-sdk/pull/213

---

## 🔧 Other Changes

**Components**
- chore: update submodule to enhance vue renderer apply default props by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/204
- chore: delete opentiny ng checkbox patch by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/225

**Build**
- chore: add multi-AI skill sync script by @gargameljyh in https://github.com/opentiny/genui-sdk/pull/212
- build: add element-plus and angular external config to workflow builds by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/220
- ci: fix GitHub Pages check-openapi-tools URL error by @gimmyhehe in https://github.com/opentiny/genui-sdk/pull/221

**Docs**
- docs: add internationalization by @lhuans in https://github.com/opentiny/genui-sdk/pull/189
- docs: add logo and DeepWiki badge to README by @chilingling in https://github.com/opentiny/genui-sdk/pull/195
- docs: add copy page markdown button to VitePress docs by @lhuans in https://github.com/opentiny/genui-sdk/pull/198
- fix(docs): keep top nav highlight when switching sidebar pages by @lhuans in https://github.com/opentiny/genui-sdk/pull/199
- fix(docs): use onContentUpdated for copy-page title anchor by @yy-wow in https://github.com/opentiny/genui-sdk/pull/201

**Site**
- feat(homepage): implement language switcher and add English translations by @lhuans in https://github.com/opentiny/genui-sdk/pull/172

---

## 🎉 New Contributors

- @chilingling made their first contribution in https://github.com/opentiny/genui-sdk/pull/195

**Full Changelog**: https://github.com/opentiny/genui-sdk/compare/v1.2.0...v1.3.0
```

> 注：有首次贡献者时，于 `## 🔧 Other Changes` 之后、`**Full Changelog**` 之前插入 `## 🎉 New Contributors` 章节，每行格式为 `- @{login} made their first contribution in https://github.com/opentiny/genui-sdk/pull/{number}`。无首次贡献者则省略整个章节。
