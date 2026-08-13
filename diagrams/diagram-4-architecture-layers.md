# 图 4：分层架构图（对应文档 6.3 节）

## 图的内容描述

展示完整的分层架构，包含四层：

1. **宿主应用（Host）**：使用 ConfigProvider 传入 materials 和 theme
2. **应用层（genui-sdk-vue）**：
   - ConfigProvider.vue（调度器）：解析 colorScheme、watch 触发、渲染 ThemeRoots
   - 下游组件：GenuiChat、Footer 等消费 colorScheme
3. **Materials 层**：
   - vue-opentiny-vue：createMaterialsTheme()、apply 用 ThemeTool、Root 是 OpenTinyThemeRoot
   - vue-element-plus：createMaterialsTheme()、apply 用 .dark class、无 Root
4. **Core 层（genui-sdk-core）**：
   - 定义 IMaterialsTheme、ThemeApplyContext、ThemeDisposer
   - 提供 mergeMaterials()

## 原始 Markdown 参考图

```
┌─────────────────────────────────────────────────────────────┐
│                      宿主应用 (Host)                         │
│   <ConfigProvider :materials="materials" theme="dark">      │
└──────────────────────────┬──────────────────────────────────┘
                           │ props
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  应用层  genui-sdk-vue                                  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ ConfigProvider.vue (调度器)                            │  │
│  │  ├─ 解析 colorScheme → provide(GENUI_CONFIG)           │  │
│  │  ├─ watch → clearTheme() + 遍历 apply()               │  │
│  │  └─ <ThemeRoots> 嵌套渲染各材料 Root                  │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌──────────────┐  注入                                     │
│  │ GenuiChat    │◄────── GENUI_CONFIG.colorScheme           │
│  │ Footer       │       (下游统一消费 colorScheme)          │
│  └──────────────┘                                            │
└──────────────────────────┬──────────────────────────────────┘
                           │ 调用 IMaterialsTheme.apply()
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  Materials 层 (各 UI 库自实现主题)                           │
│                                                              │
│  ┌─ vue-opentiny-vue ───────────────────────────────┐        │
│  │ createMaterialsTheme()                   │        │        │
│  │  ├─ apply: ThemeTool.changeTheme(CSS)            │        │
│  │  ├─ Root: OpenTinyThemeRoot (TinyConfigProvider) │        │
│  │  └─ themes: light/dark/lite                      │        │
│  └──────────────────────────────────────────────────┘        │
│                                                              │
│  ┌─ vue-element-plus ──────────────────────────────┐        │
│  │ createMaterialsTheme()                │        │        │
│  │  ├─ apply: rootEl.classList.add('dark')          │        │
│  │  ├─ Root: 无                                     │        │
│  │  └─ themes: light/dark                           │        │
│  └──────────────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────────────┘
                           ▲
                           │ 定义协议
┌──────────────────────────────────────────────────────────────┐
│  Core 层  genui-sdk-core                                      │
│  ├─ IMaterialsTheme / ThemeApplyContext / ThemeDisposer      │
│  ├─ IMaterials.theme?: IMaterialsTheme | IMaterialsTheme[]   │
│  └─ mergeMaterials()                                         │
└──────────────────────────────────────────────────────────────┘
```

## 生图提示词

### 中文版

```
分层架构图，从上到下四层结构，每层用不同颜色区分：

第一层（顶部）：宿主应用层
- 标题：宿主应用 (Host)
- 内容：显示代码片段 <ConfigProvider :materials="materials" theme="dark">
- 颜色：浅紫色
- 向下箭头标注"props"

第二层：应用层
- 标题：应用层 (genui-sdk-vue)
- 左侧大框：ConfigProvider.vue（调度器）
  - 解析 colorScheme → provide(GENUI_CONFIG)
  - watch → clearTheme() + 遍历 apply()
  - <ThemeRoots> 嵌套渲染各材料 Root
- 右侧：下游组件框
  - GenuiChat、Footer 等
  - 向左箭头标注"GENUI_CONFIG.colorScheme"
- 颜色：浅绿色
- 向下箭头标注"调用 IMaterialsTheme.apply()"

第三层：Materials 层
- 标题：Materials 层（各 UI 库自实现主题）
- 左侧框：vue-opentiny-vue
  - createMaterialsTheme()
  - apply: ThemeTool.changeTheme(CSS)
  - Root: OpenTinyThemeRoot
  - themes: light/dark/lite
- 右侧框：vue-element-plus
  - createMaterialsTheme()
  - apply: rootEl.classList.add('dark')
  - Root: 无
  - themes: light/dark
- 颜色：浅橙色
- 向下虚线箭头标注"定义协议"

第四层（底部）：Core 层
- 标题：Core 层 (genui-sdk-core)
- 内容：
  - IMaterialsTheme / ThemeApplyContext / ThemeDisposer
  - IMaterials.theme?: IMaterialsTheme | IMaterialsTheme[]
  - mergeMaterials()
- 颜色：浅蓝色

整体风格：现代分层架构图，清晰的层级关系，使用卡片式布局，每个模块有图标，白色背景，专业配色，使用箭头表示调用关系
```

### English Version

```
Layered architecture diagram, four layers from top to bottom, each layer with different color:

Layer 1 (Top): Host Application Layer
- Title: "Host Application"
- Content: Show code snippet <ConfigProvider :materials="materials" theme="dark">
- Color: Light purple
- Downward arrow labeled "props"

Layer 2: Application Layer
- Title: "Application Layer (genui-sdk-vue)"
- Left large box: ConfigProvider.vue (Dispatcher)
  - Parse colorScheme → provide(GENUI_CONFIG)
  - watch → clearTheme() + iterate apply()
  - <ThemeRoots> nested rendering of material Roots
- Right: Downstream components box
  - GenuiChat, Footer, etc.
  - Leftward arrow labeled "GENUI_CONFIG.colorScheme"
- Color: Light green
- Downward arrow labeled "Call IMaterialsTheme.apply()"

Layer 3: Materials Layer
- Title: "Materials Layer (Each UI library implements its own theme)"
- Left box: vue-opentiny-vue
  - createMaterialsTheme()
  - apply: ThemeTool.changeTheme(CSS)
  - Root: OpenTinyThemeRoot
  - themes: light/dark/lite
- Right box: vue-element-plus
  - createMaterialsTheme()
  - apply: rootEl.classList.add('dark')
  - Root: None
  - themes: light/dark
- Color: Light orange
- Downward dashed arrow labeled "Define protocol"

Layer 4 (Bottom): Core Layer
- Title: "Core Layer (genui-sdk-core)"
- Content:
  - IMaterialsTheme / ThemeApplyContext / ThemeDisposer
  - IMaterials.theme?: IMaterialsTheme | IMaterialsTheme[]
  - mergeMaterials()
- Color: Light blue

Style: Modern layered architecture diagram, clear hierarchical relationships, use card-style layout, icons for each module, white background, professional color scheme, use arrows to indicate call relationships
```

## 风格建议

- 每层用不同的柔和色调区分
- 使用卡片式布局展示每个组件
- 箭头清晰表示调用方向
- 用虚线表示协议/接口关系
- 添加小图标（如 Vue logo、组件图标、配置图标）
- 保持层次分明，间距合理
- 使用阴影增强层次感
