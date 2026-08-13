# 图 3：依赖关系对比图（对应文档 6.2 节）

## 图的内容描述

展示重构前后的依赖关系变化：

**重构前**（应用层直接依赖 UI 库）：
- ConfigProvider.vue 直接 import @opentiny/vue
- ConfigProvider.vue 直接 import @opentiny/vue-theme/theme-tool

**重构后**（依赖反转，应用层不再依赖 UI 库）：
- ConfigProvider.vue 只 import @opentiny/genui-sdk-core（协议）
- vue-opentiny-vue 实现 IMaterialsTheme，指向 core
- vue-element-plus 实现 IMaterialsTheme，指向 core

## 原始 Markdown 参考图

**重构前**（应用层直接依赖 UI 库）：

```
ConfigProvider.vue ──import──> @opentiny/vue
                   ──import──> @opentiny/vue-theme/theme-tool
```

**重构后**（依赖反转，应用层不再依赖 UI 库）：

```
ConfigProvider.vue ──import──> @opentiny/genui-sdk-core (协议)
                                                    ▲
                                                    │ implements
        ┌─────────────────────────┐                 │
        │ vue-opentiny-vue         │─────────────────┤
        │  createMaterialsTheme()  │                 │
        └─────────────────────────┘                 │
                                                    │
        ┌─────────────────────────┐                 │
        │ vue-element-plus        │─────────────────┤
        │  createMaterialsTheme() │                 │
        └─────────────────────────┘                 │
```

## 生图提示词

### 中文版

```
对比图，左右两栏布局，展示重构前后的依赖关系变化：

左侧标题：重构前（应用层直接依赖 UI 库）
- 顶部：ConfigProvider.vue（蓝色方块）
- 两条向下箭头
- 底部左：@opentiny/vue（灰色方块）
- 底部右：@opentiny/vue-theme/theme-tool（灰色方块）
- 箭头颜色：红色（表示紧耦合）

右侧标题：重构后（依赖反转，应用层不再依赖 UI 库）
- 顶部：ConfigProvider.vue（蓝色方块）
- 一条向下箭头，指向中间的 Core 层
- 中间：@opentiny/genui-sdk-core（绿色方块，标注"协议"）
- Core 层有向上虚线箭头，标注"implements"
- 底部左：vue-opentiny-vue（橙色方块）
  - 标注：createMaterialsTheme()
- 底部右：vue-element-plus（绿色方块）
  - 标注：createMaterialsTheme()
- 箭头颜色：绿色（表示解耦）

中间用虚线分隔，标注"重构"

整体风格：现代依赖图，使用方块和箭头，清晰的标签，白色背景，专业配色，使用图标表示模块类型
```

### English Version

```
Comparison diagram, two-column layout showing dependency relationship changes before and after refactoring:

Left column title: "Before Refactoring (Application Layer directly depends on UI libraries)"
- Top: ConfigProvider.vue (blue box)
- Two downward arrows
- Bottom left: @opentiny/vue (gray box)
- Bottom right: @opentiny/vue-theme/theme-tool (gray box)
- Arrow color: Red (indicating tight coupling)

Right column title: "After Refactoring (Dependency inversion, Application Layer no longer depends on UI libraries)"
- Top: ConfigProvider.vue (blue box)
- One downward arrow pointing to Core layer in the middle
- Middle: @opentiny/genui-sdk-core (green box, labeled "Protocol")
- Core layer has upward dashed arrow, labeled "implements"
- Bottom left: vue-opentiny-vue (orange box)
  - Label: createMaterialsTheme()
- Bottom right: vue-element-plus (green box)
  - Label: createMaterialsTheme()
- Arrow color: Green (indicating loose coupling)

Middle separated by dashed line, labeled "Refactoring"

Style: Modern dependency diagram, use boxes and arrows, clear labels, white background, professional color scheme, use icons to indicate module types
```

## 风格建议

- 使用对比色（红 vs 绿）强调变化
- 用虚线表示实现关系
- 用实线表示依赖关系
- 添加"紧耦合"和"解耦"的标签
- 使用图标区分不同类型的模块
- 保持对称和平衡
