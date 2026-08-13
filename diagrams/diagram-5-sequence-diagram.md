# 图 5：主题切换时序图（对应文档 6.4 节）

## 图的内容描述

展示主题切换的完整时序流程，包含四个参与者：
1. Host（宿主应用）
2. ConfigProvider
3. OpenTiny 材料主题
4. ElementPlus 材料主题

流程：
1. Host 传入 theme="dark"
2. ConfigProvider 解析 colorScheme='dark'，provide(config)
3. watch 触发，clearTheme()
4. 调用 OpenTiny 的 dispose()，恢复空白 CSS
5. 调用 ElementPlus 的 dispose()，remove dark
6. 调用 OpenTiny 的 apply('dark', ctx)，ThemeTool 注入 dark CSS
7. 返回 disposer
8. 调用 ElementPlus 的 apply('dark', ctx)，add 'dark' class
9. 返回 disposer
10. 收集 disposers=[d1,d2]
11. 卸载时：onBeforeUnmount 触发，clearTheme() 调用所有 disposer

## 原始 Markdown 参考图

```
Host         ConfigProvider      OpenTiny材料主题      ElementPlus材料主题
 │                │                     │                      │
 │ theme="dark"  │                     │                      │
 │───────────────>│                     │                      │
 │                │ colorScheme='dark'  │                      │
 │                │ provide(config)     │                      │
 │                │                     │                      │
 │                │ watch触发           │                      │
 │                │ clearTheme()        │                      │
 │                │   (调旧disposer) ───>│ dispose()           │
 │                │                     │   恢复空白CSS         │
 │                │                     │                      │ dispose()
 │                │────────────────────────────────────────────>│
 │                │ apply('dark',ctx)  │                      │ remove dark
 │                │───────────────────>│                      │
 │                │                     │ ThemeTool注入        │
 │                │                     │ dark CSS             │
 │                │<─ disposer ─────────│                      │
 │                │ apply('dark',ctx)   │                      │
 │                │────────────────────────────────────────────>│
 │                │                     │                      │ add 'dark' class
 │                │<─ disposer ─────────────────────────────────│
 │                │ disposers=[d1,d2]   │                      │
 │                │                     │                      │
 │ 卸载时         │                     │                      │
 │                │ onBeforeUnmount     │                      │
 │                │  clearTheme() ─────>│ dispose()            │
 │                │────────────────────────────────────────────>│ dispose()
```

## 生图提示词

### 中文版

```
时序图，四个垂直生命线，从左到右：

参与者（顶部）：
1. Host（用户图标）
2. ConfigProvider（服务器图标）
3. OpenTiny 材料主题（橙色图标）
4. ElementPlus 材料主题（绿色图标）

时间线流程：

阶段 1：主题切换触发
- Host → ConfigProvider：theme="dark"（实线箭头）
- ConfigProvider 自处理：解析 colorScheme='dark'，provide(config)（自循环箭头）

阶段 2：清理旧主题
- ConfigProvider 自处理：watch 触发，clearTheme()（自循环箭头）
- ConfigProvider → OpenTiny：dispose()（实线箭头，黄色）
  - 标注：恢复空白 CSS
- ConfigProvider → ElementPlus：dispose()（实线箭头，黄色）
  - 标注：remove dark class

阶段 3：应用新主题
- ConfigProvider → OpenTiny：apply('dark', ctx)（实线箭头，蓝色）
- OpenTiny 自处理：ThemeTool 注入 dark CSS（自循环箭头）
- OpenTiny → ConfigProvider：返回 disposer（虚线箭头）
- ConfigProvider → ElementPlus：apply('dark', ctx)（实线箭头，蓝色）
- ElementPlus 自处理：add 'dark' class（自循环箭头）
- ElementPlus → ConfigProvider：返回 disposer（虚线箭头）

阶段 4：收集 disposer
- ConfigProvider 自处理：disposers=[d1,d2]（自循环箭头）

阶段 5：卸载清理
- 虚线分隔，标注"卸载时"
- ConfigProvider 自处理：onBeforeUnmount（自循环箭头）
- ConfigProvider → OpenTiny：clearTheme() → dispose()（实线箭头，红色）
- ConfigProvider → ElementPlus：clearTheme() → dispose()（实线箭头，红色）

整体风格：标准 UML 时序图，清晰的生命线，不同颜色的箭头表示不同操作类型（黄色=清理，蓝色=应用，红色=销毁），白色背景，专业配色，每个消息有清晰标签
```

### English Version

```
Sequence diagram, four vertical lifelines from left to right:

Participants (top):
1. Host (user icon)
2. ConfigProvider (server icon)
3. OpenTiny Material Theme (orange icon)
4. ElementPlus Material Theme (green icon)

Timeline flow:

Phase 1: Theme Switch Trigger
- Host → ConfigProvider: theme="dark" (solid arrow)
- ConfigProvider self: Parse colorScheme='dark', provide(config) (self-loop arrow)

Phase 2: Clear Old Theme
- ConfigProvider self: watch triggered, clearTheme() (self-loop arrow)
- ConfigProvider → OpenTiny: dispose() (solid arrow, yellow)
  - Label: Restore blank CSS
- ConfigProvider → ElementPlus: dispose() (solid arrow, yellow)
  - Label: remove dark class

Phase 3: Apply New Theme
- ConfigProvider → OpenTiny: apply('dark', ctx) (solid arrow, blue)
- OpenTiny self: ThemeTool injects dark CSS (self-loop arrow)
- OpenTiny → ConfigProvider: Return disposer (dashed arrow)
- ConfigProvider → ElementPlus: apply('dark', ctx) (solid arrow, blue)
- ElementPlus self: add 'dark' class (self-loop arrow)
- ElementPlus → ConfigProvider: Return disposer (dashed arrow)

Phase 4: Collect Disposer
- ConfigProvider self: disposers=[d1,d2] (self-loop arrow)

Phase 5: Unmount Cleanup
- Dashed separator, labeled "On unmount"
- ConfigProvider self: onBeforeUnmount (self-loop arrow)
- ConfigProvider → OpenTiny: clearTheme() → dispose() (solid arrow, red)
- ConfigProvider → ElementPlus: clearTheme() → dispose() (solid arrow, red)

Style: Standard UML sequence diagram, clear lifelines, different colored arrows for different operation types (yellow=cleanup, blue=apply, red=destroy), white background, professional color scheme, clear labels for each message
```

## 风格建议

- 使用标准 UML 时序图格式
- 生命线用虚线表示
- 自循环消息用弯曲箭头
- 返回消息用虚线箭头
- 用颜色区分不同阶段的操作
- 添加激活框（activation box）表示处理时间
- 保持时间线清晰，避免交叉
- 每个消息标注清楚
