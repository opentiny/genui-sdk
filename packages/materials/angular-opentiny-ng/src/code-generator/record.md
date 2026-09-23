# TinyNG 组件特判记录

本文记录 TinyNG 出码时对特定组件做特殊处理的原因与对应实现:

## 启动测试界面

```bash
pnpm dev:angular-test
```
## 1. TiItem的`label`属性 须以 `[label]=` 绑定形式输出

**为什么要包成表达式**:`<ti-item label="姓名">` 的静态属性在**视图创建相**写入,而 TiItemComponent 的 setter 在创建相调 `detectChanges()`,撞上 Angular 20「创建相不得触发变更检测」的断言(创建相只建 DOM/实例,更新相 `refreshView` 才写绑定值)。包成 `JSExpression` 后走 `[label]="'姓名'"`,编译成更新相的 `ɵɵproperty`,创建相不碰 setter。

---
