# 图 2：主题切换主流程图（对应文档 6.1 节）

## 图的内容描述

展示用户传入 theme="dark" 后，ConfigProvider 的完整处理流程：
1. 用户传入 theme="dark"
2. ConfigProvider 解析 colorScheme = 'dark'，provide 给下游
3. watch 触发，调用 clearTheme() 清理旧主题
4. 遍历 materialThemes
5. 分别调用 OpenTiny 和 ElementPlus 的 apply()
6. OpenTiny 用 ThemeTool 注入 CSS，ElementPlus 添加 .dark class
7. 收集 disposers 供下次切换时清理

## 原始 Markdown 参考图

```
用户传入 theme="dark"
        │
        ▼
┌──────────────────┐
│ ConfigProvider   │  解析 colorScheme = 'dark'
│ - theme id       │  provide(GENUI_CONFIG, { colorScheme })
│ - mediaTheme     │
└────────┬─────────┘
         │ watch 触发
         ▼
┌──────────────────┐
│ clearTheme()     │  调用上一轮所有 disposer，回滚旧主题
└────────┬─────────┘
         ▼
┌──────────────────┐
│ 遍历 materialThemes
└────────┬─────────┘
         │
   ┌─────┴──────┐
   ▼            ▼
┌──────┐   ┌──────────┐
│OpenTiny│   │ElementPlus│
│apply()│   │apply()    │
└───┬──┘   └─────┬────┘
    │              │
    ▼              ▼
 ThemeTool        .dark class
 注入 CSS         加到 rootEl
    │              │
    └──────┬───────┘
           ▼
   disposers 收集
   (切换时统一清理)
```

## 生图提示词

### 中文版

```
流程图，垂直向下流程，从用户输入开始：

起点：用户传入 theme="dark"（用户图标）

步骤 1：ConfigProvider 处理框
- 解析 colorScheme = 'dark'
- provide(GENUI_CONFIG, { colorScheme })
- 颜色：蓝色

步骤 2：clearTheme() 处理框
- 调用上一轮所有 disposer，回滚旧主题
- 颜色：黄色/警告色

步骤 3：遍历 materialThemes 处理框
- 颜色：蓝色

步骤 4：分支（两个并排）
- 左分支：OpenTiny apply()
  - ThemeTool 注入 CSS
  - 颜色：浅橙色
- 右分支：ElementPlus apply()
  - .dark class 加到 rootEl
  - 颜色：浅绿色

步骤 5：合并
- disposers 收集（切换时统一清理）
- 颜色：灰色

整体风格：现代流程图，使用圆角矩形，清晰的箭头连接，每个步骤有图标，白色背景，专业配色
```

### English Version

```
Flowchart, vertical downward flow starting from user input:

Start: User passes theme="dark" (user icon)

Step 1: ConfigProvider processing box
- Parse colorScheme = 'dark'
- provide(GENUI_CONFIG, { colorScheme })
- Color: Blue

Step 2: clearTheme() processing box
- Call all previous disposers, rollback old theme
- Color: Yellow/warning color

Step 3: Iterate materialThemes processing box
- Color: Blue

Step 4: Branch (two parallel paths)
- Left branch: OpenTiny apply()
  - ThemeTool injects CSS
  - Color: Light orange
- Right branch: ElementPlus apply()
  - Add .dark class to rootEl
  - Color: Light green

Step 5: Merge
- Collect disposers (clean up uniformly on next switch)
- Color: Gray

Style: Modern flowchart, use rounded rectangles, clear arrow connections, icons for each step, white background, professional color scheme
```

## 风格建议

- 使用标准流程图符号（开始/结束用椭圆，处理用矩形，判断用菱形）
- 每个步骤添加相应图标
- 使用渐变色增强视觉层次
- 箭头清晰，避免交叉
- 保持足够的间距
