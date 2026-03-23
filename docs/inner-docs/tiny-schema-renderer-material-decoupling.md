# tiny-schema-renderer 物料解耦方案

本文档描述 `@opentiny/tiny-schema-renderer` 与具体 UI 组件库（如 TinyVue、图表包等）解耦的目标、现状、推荐架构与落地路径，供 GenUI SDK 与业务集成时参考。

---

## 1. 背景与问题

### 1.1 渲染器职责

`tiny-schema-renderer` 负责将 **Schema（JSON）** 解析为 **Vue 组件树**。其中关键一步是：根据 `componentName` 解析出 **可渲染的 Vue 组件**。

### 1.2 典型耦合点（历史形态）

在 `renderer/render.js` 中，常见耦合包括：

| 类型 | 说明 |
|------|------|
| 静态依赖 | 顶层 `import TinyVue`、`import @opentiny/vue-chart-*` 等 |
| 动态兜底 | `getNative(name) => TinyVue?.[name]` 将解析与 TinyVue 命名空间绑定 |
| 内置映射 | `Mapper` 中混入图表等「业务 UI」组件，而非仅画布/协议层节点 |
| 提示能力 | `Notify` 等直接来自 `@opentiny/vue`，与具体 UI 库绑定 |

结果是：**换组件库、按需加载、多物料共存、运行时切换** 都会牵动渲染器核心代码。

### 1.3 目标能力

- **解耦**：内核不依赖具体物料包；物料由外部注册或注入。
- **配置化**：启用哪些物料、优先级、白名单等可由配置或后端驱动。
- **懒加载**：在 **`getComponent` 保持同步** 的前提下，通过返回 `defineAsyncComponent` 实现按需加载。
- **运行时切换**：可切换物料集；多实例场景下避免互相污染（见第 6 节「单例」处理）。

---

## 2. 组件解析链路（概念模型）

Schema 节点上的 `componentName` 经统一入口解析：

```text
getComponent(componentName)
  → ① 内置/协议层组件（画布、Text、Icon、div 等）
  → ② 已注册的「物料源」（对象映射或函数解析）
  → ③ 自定义元素 / HTML 标签兜底
```

**原则**：内核只定义 **解析顺序与协议**；**② 的内容全部由物料层提供**。

---

## 3. 推荐分层

```text
┌─────────────────────────────────────────────────────────┐
│ 应用 / Playground                                        │
│  - 读取 MaterialProfile（本地或后端）                     │
│  - 调用 SDK：装配 registry / 注册物料                    │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│ @opentiny/genui-sdk-vue（可选编排层）                      │
│  - SchemaCardRenderer：不直接依赖具体物料包                 │
│  - 提供 setupMaterials / 或透传 materialRegistry           │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│ 物料包（如 genui-sdk-materials-vue-opentiny-vue）          │
│  - componentMap / componentResolver / notifyAdapter       │
│  - 可全部为懒加载入口（defineAsyncComponent + import()）   │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│ @opentiny/tiny-schema-renderer（内核）                    │
│  - getComponent：只依赖「注入的 registry」或「注册的 sources」 │
│  - setNotify：可替换错误提示，不绑定 TinyVue Notify       │
└─────────────────────────────────────────────────────────┘
```

---

## 4. 两种物料接入模式

### 4.1 模式 A：模块级物料注册表（实现快，适合单应用单物料集）

在 `render.js` 内维护 `Map` 型 **materialSources**，对外暴露：

- `registerMaterial(name, source)`
- `unregisterMaterial(name)` / `clearMaterials()`（按需）
- `getComponent` 内遍历 sources 解析（可封装为 `resolveMaterialComponent(name)`）

**source 形态**：

- `Record<string, Component>`：静态映射；
- `(name: string) => Component | undefined`：按名解析（适合 TinyVue 整包 fallback）。

**优点**：改动面小，与现有「导出 `Mapper`」兼容性好。  
**缺点**：**全局单例**——同页多区域需要不同物料集时易互相影响。

### 4.2 模式 B：Renderer 实例级 MaterialRegistry（推荐：多实例安全）

为每个 `<SchemaRenderer />`（或每条消息卡片）绑定 **独立的** `MaterialRegistry`：

```ts
interface MaterialRegistry {
  resolveComponent(name: string): unknown | null; // Vue 组件，可为 defineAsyncComponent 结果
}
```

**注入方式（二选一）**：

1. **Prop**：`SchemaRenderer` 接收 `materialRegistry`，在 `setup` 中写入子树上下文；
2. **provide/inject**：`RenderMain` `provide(MATERIAL_REGISTRY_KEY, registry)`，`getComponent` 通过 `inject` 读取（需在 Vue 组件上下文中调用）。

**优点**：同页多实例、多租户、A/B 物料互不污染。  
**缺点**：需改造 `RenderMain` / `render.js` 的解析入口，工作量大于模式 A。

---

## 5. 懒加载（getComponent 仍为同步）

**不要求** `getComponent` 返回 `Promise`。正确做法是：

- `resolveComponent(name)` **同步返回** Vue 组件类型；
- 该类型由 `defineAsyncComponent({ loader: () => import('...') })` 构造；
- 真正网络加载发生在 **Vue 渲染异步组件时**，而非 `getComponent` 内部。

物料包示例思路：

```ts
// 伪代码：按组件名懒加载
const loaders: Record<string, () => Promise<any>> = {
  TinySelect: () => import('./TinySelectWrap.vue').then(m => m.default),
};

export function resolve(name: string) {
  const loader = loaders[name];
  if (!loader) return null;
  return defineAsyncComponent({ loader });
}
```

**粗粒度 fallback**（整包 TinyVue）也可用 `import('@opentiny/vue').then(m => m[name])`，拆包效果取决于构建与库的导出方式。

---

## 6. 「Renderer 为单例」时如何处理

若业务上 **只存在一个 SchemaRenderer 实例**（或全局共用一个默认导出组件），仍可能出现两类「单例」含义，需分别处理。

### 6.1 npm 包默认导出是「单例组件定义」

Vue 的 **组件定义** 可被多处 `<SchemaRenderer />` 复用，**不等于**物料状态必须全局一份。

- **模式 A**：全局 `registerMaterial` 时，所有实例共享同一套物料——符合「全站一套物料」。
- **模式 B**：每个 `<SchemaRenderer :material-registry="registry" />` 传不同 registry——**同一组件定义，多实例不同物料**。

### 6.2 若物料状态误做成进程级单例

当 `materialSources`、`Mapper` 被多个业务同时 `register/clear` 时，会互相踩踏。

**缓解手段**：

| 手段 | 说明 |
|------|------|
| 实例级 Registry | 升级为模式 B，物料状态挂在实例上 |
| 命名空间注册 | `registerMaterial('tenant-a', ...)`，切换租户时只换当前 profile 对应的一组 key |
| 版本 key + remount | 切换物料后对包裹层 `:key="profileVersion"`，强制子树重建 |
| 读写隔离 | 禁止业务直接改共享 `Mapper`；统一走 register API |

---

## 7. 与 GenUI Vue 的衔接建议

- **SchemaCardRenderer**（`packages/frameworks/vue`）宜 **不 import** 具体物料包；物料装配放在：
  - 应用 `main.ts` / `setup-materials.ts`，或
  - SDK 提供的 `setupGenuiMaterials(profile)` 中完成。
- **自定义组件**：若需按卡片传入 `customComponents`，优先写入 **当前实例的 registry** 或 **带实例前缀的 register**，避免污染全局 `Mapper`。
- **多框架**：已有 `GENUI_RENDERER` 注入自定义渲染器时，物料策略应在「该渲染器实现」或「其外层」完成，与 `tiny-schema-renderer` 并行演进。

---

## 8. 迁移路径（建议顺序）

1. **剥离内核静态依赖**：`render.js` 不再 `import` TinyVue/图表；图表与业务组件改由物料包注册。
2. **统一解析入口**：`getComponent` 只走「内置 + 物料 sources + 兜底」；封装 `resolveMaterialComponent`。
3. **通知解耦**：`Notify` 改为 `setNotify` 注入的适配器。
4. **编排上移**：Playground/业务只依赖 `genui-sdk-vue` 的装配 API，不直接依赖 `tiny-schema-renderer` + 物料包两处。
5. **（可选）实例级 Registry**：多实例需求明确后，引入 `materialRegistry` prop 或 `MATERIAL_REGISTRY_KEY`。

---

## 9. 相关文件（仓库内）

| 路径 | 说明 |
|------|------|
| `projects/tiny-schema-renderer/renderer/render.js` | `getComponent`、`Mapper`、解析与（可选）物料注册 |
| `projects/tiny-schema-renderer/renderer/RenderMain.js` | Renderer 根组件，可扩展 `materialRegistry` provide |
| `projects/tiny-schema-renderer/index.js` | 包导出 |
| `packages/frameworks/vue/src/renderer/SchemaCardRenderer.vue` | GenUI 卡片渲染封装 |
| `packages/materials/vue-opentiny-vue` | OpenTiny 物料实现（建议统一从 `index.ts` 导出） |

---

## 10. 文档维护

- 本文档描述 **目标架构与演进方向**；具体 API 名称以仓库内实现为准。
- 若内核已完成「物料注册 API」或「实例级 Registry」，请在对应章节补充 **实际导出列表** 与 **最小示例**。

---

## 11. 仓库内已对齐实现（摘要）

| 能力 | 说明 |
|------|------|
| 全局物料 | `registerMaterial` / `unregisterMaterial` / `clearMaterials`，`render.js` 内 `resolveMaterialComponent` |
| 实例物料 | `MATERIAL_REGISTRY_KEY`：`RenderMain` `provide`，子树 `getComponent` 内 `inject` + `resolveComponent` |
| pageContext | `setSchema` 时写入 `materialRegistry`，供 `getComponent(name, pageCtx)` 与 JSX 绑定路径使用 |
| 通知解耦 | `setNotify` 替换原 `Notify` 硬依赖 |
| SDK 编排 | `@opentiny/genui-sdk-vue` 导出 `setupGenuiVueDefaultMaterials`、`getDefaultOpenTinyMaterialRegistry`；`SchemaCardRenderer` 透传 `:material-registry` |
| Playground | `main.ts` 调用 `setupGenuiVueDefaultMaterials()`，无需直接依赖 `tiny-schema-renderer` 与物料包 |
