# 物料选型指南

GenUI SDK 自 v1.3.0 起将核心 SDK 与 UI 物料解耦，需通过 `GenuiConfigProvider` 注入物料。本目录汇总官方物料包与可选方案。

类型定义（`IMaterials`、`IMaterialsMeta`、`IMaterialsTheme`）见 [Core API](../guides/core-api.md)（构建时从 docs 同步）。

## 官方物料（默认推荐）

| 技术栈 | 包名 | 专页 |
|--------|------|------|
| Vue | `@opentiny/genui-sdk-materials-vue-opentiny-vue` | [vue-opentiny-vue.md](./vue-opentiny-vue.md) |
| Angular | `@opentiny/genui-sdk-materials-angular-opentiny-ng` | [angular-opentiny-ng.md](./angular-opentiny-ng.md) |
| React | `@opentiny/genui-sdk-materials-react-antd`（基于 Ant Design，需项目安装 `antd`） | [react-antd.md](./react-antd.md) |

## 服务端物料对齐

使用 `genui-sdk-server` 时，服务端 `materialsMeta` 决定注入 prompt 的组件清单，**必须与前端 `GenuiConfigProvider` 注入的物料一致**，否则大模型生成的组件名前端无法渲染。

服务端内置默认只覆盖 Vue 与 Angular：

| framework | 前端注入 | 服务端 `materialsMeta` | 内置默认 |
|-----------|----------|----------------------|----------|
| Vue | `@opentiny/genui-sdk-materials-vue-opentiny-vue/materials` | `@opentiny/genui-sdk-materials-vue-opentiny-vue/meta` | ✅ |
| Angular | `@opentiny/genui-sdk-materials-angular-opentiny-ng/materials` | `@opentiny/genui-sdk-materials-angular-opentiny-ng/meta` | ✅ |
| 其他 / 未指定 | — | 回落到 Vue 默认物料 | — |

**前端物料只要与内置默认不一致，就必须在服务端显式传入对应的 `materialsMeta`**：React Ant Design 传 `@opentiny/genui-sdk-materials-react-antd/meta`，Vue Element Plus 传 `@opentiny/genui-sdk-materials-vue-element-plus/meta`，Vue 精简集传 `miniMaterialsMeta`，自定义物料传自备 `IMaterialsMeta`。

> CLI（`npx genui-sdk-server`）不提供物料参数，只能使用内置默认物料；替换物料时必须改用 `startServer` / `equipChatCompletions` 显式传入。详见 [Server 集成指南](../server.md) 的「物料配置（materialsMeta）」。

## 可选物料与变体

| 方案 | 包名 / 导出 | 适用场景 | 专页 |
|------|-------------|----------|------|
| Element Plus 替代 | `@opentiny/genui-sdk-materials-vue-element-plus` | 项目已使用 Element Plus，希望统一 UI 库 | [vue-element-plus.md](./vue-element-plus.md) |
| 精简组件集 | `miniMaterials` / `miniMaterialsMeta` | 不需要图表等重型组件，减小体积 | [vue-opentiny-vue.md](./vue-opentiny-vue.md) |
| 旧项目迁移 | `GenuiLegacyChat` / `GenuiLegacyRenderer` | v1.3.0 前项目，内置物料，无需单独装包 | 见 `references/vue.md` 或 `references/angular.md` 兼容组件章节 |

### 注意事项

- **Element Plus**：需额外 `import 'element-plus/dist/index.css'`；无 mini 版本；`wrapperComponent` 默认为 `ElCard`。
- **miniMaterials**：前后端须一致——前端注入 `miniMaterials`，服务端 `genPrompt` 使用 `miniMaterialsMeta`。
- **Legacy 组件**：仅用于迁移，新项目应使用官方物料包 + `GenuiConfigProvider`。

## 各物料包专页

- Vue OpenTiny Vue：[vue-opentiny-vue.md](./vue-opentiny-vue.md)
- Vue Element Plus：[vue-element-plus.md](./vue-element-plus.md)
- Angular OpenTiny NG：[angular-opentiny-ng.md](./angular-opentiny-ng.md)
- React Ant Design：[react-antd.md](./react-antd.md)
