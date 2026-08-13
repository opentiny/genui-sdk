# 图 1：分层职责图（对应文档 4.2 节）

## 图的内容描述

展示主题切换重构后的三层职责分离：
- **Core 层**：定义协议（IMaterialsTheme、ThemeApplyContext）
- **应用层**：ConfigProvider 编排、调用 apply()、渲染 Root、注入 colorScheme
- **Materials 层**：vue-opentiny-vue 和 vue-element-plus 各自实现 createMaterialsTheme()

## 原始 Markdown 参考图

```
┌─────────────────────────────────────────────────────────┐
│  Core 层 (genui-sdk-core)                               │
│  ─ 定义协议：IMaterialsTheme / ThemeApplyContext        │
│  ─ 合并工具：mergeMaterials?                             │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  应用层 (genui-sdk-vue)                           │
│  ─ ConfigProvider：编排，调用 apply()，渲染 Root         │
│  ─ 注入 colorScheme 给下游                              │
│  ─ 不 import 任何 UI 库主题包                           │
├─────────────────────────────────────────────────────────┤
│  Materials 层                                            │
│  ─ vue-opentiny-vue：createMaterialsTheme()     │
│      ├─ 用 ThemeTool + tinyDarkTheme/lite 切 CSS         │
│      └─ Root = OpenTinyThemeRoot (TinyConfigProvider)   │
│  ─ vue-element-plus：createMaterialsTheme()  │
│      └─ 用 .dark class 切换                              │
└─────────────────────────────────────────────────────────┘
```

## 生图提示词

### 中文版

```
技术架构图，垂直分层结构，从上到下三层：

第一层（顶部）：Core 层
- 标题：Core 层 (genui-sdk-core)
- 内容：定义协议 IMaterialsTheme / ThemeApplyContext
- 颜色：浅蓝色背景

第二层（中间）：应用层
- 标题：应用层 (genui-sdk-vue)
- 内容：ConfigProvider 编排调用、注入 colorScheme 给下游
- 颜色：浅绿色背景

第三层（底部）：Materials 层
- 标题：Materials 层
- 内容：两个并排模块
  - vue-opentiny-vue：createMaterialsTheme()，用 ThemeTool 切 CSS
  - vue-element-plus：createMaterialsTheme()，用 .dark class 切换
- 颜色：浅橙色背景

整体风格：现代扁平化设计，清晰的边框和分隔线，专业的技术图表风格，白色背景，使用图标增强可读性
```

### English Version

```
Technical architecture diagram, vertical layered structure from top to bottom:

Top Layer: Core Layer
- Title: "Core Layer (genui-sdk-core)"
- Content: Define protocols IMaterialsTheme / ThemeApplyContext
- Color: Light blue background

Middle Layer: Application Layer
- Title: "Application Layer (genui-sdk-vue)"
- Content: ConfigProvider orchestration, inject colorScheme to downstream
- Color: Light green background

Bottom Layer: Materials Layer
- Title: "Materials Layer"
- Content: Two side-by-side modules
  - vue-opentiny-vue: createMaterialsTheme(), use ThemeTool for CSS switching
  - vue-element-plus: createMaterialsTheme(), use .dark class switching
- Color: Light orange background

Style: Modern flat design, clear borders and separators, professional technical diagram style, white background, use icons to enhance readability
```

## 风格建议

- 使用卡片式布局
- 每层之间用箭头或连接线表示关系
- 使用统一的配色方案
- 添加小图标（如齿轮、代码块、组件图标）
- 保持简洁专业
