# 物料选型指南

GenUI SDK 自 v1.3.0 起将核心 SDK 与 UI 物料解耦，需通过 `GenuiConfigProvider` 注入物料。本目录汇总官方物料包与可选方案。

类型定义（`IMaterials`、`IMaterialsMeta`）见 [Core API 在线文档](https://docs.opentiny.design/genui-sdk/components/core/api)。

## 官方物料（默认推荐）

| 技术栈 | 包名 | 专页 |
|--------|------|------|
| Vue | `@opentiny/genui-sdk-materials-vue-opentiny-vue` | [vue-opentiny-vue.md](./vue-opentiny-vue.md) |
| Angular | `@opentiny/genui-sdk-materials-angular-opentiny-ng` | [angular-opentiny-ng.md](./angular-opentiny-ng.md) |

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

## 在线文档

完整物料包文档：https://docs.opentiny.design/genui-sdk/components/materials/
