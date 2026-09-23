# TinyNG 组件特判记录

本文记录 TinyNG 出码时对特定组件做特殊处理的原因与对应实现:

## 启动测试界面

```bash
pnpm dev:angular-test
```
## 1. TiItem:`label` 必须以 `[label]=` 绑定形式输出

**崩溃根因**(Angular 20):`TiItemComponent.setItemLabel` 在设置 `label` 属性时调用 `this.formfield.changeDetector.detectChanges()` 与 `this.changeDetector.detectChanges()`。而 `<ti-item label="姓名">` 的 `label` 是**静态属性输入**(编译为 `tNode.initialInputs`),会在视图**创建期**(create pass)被写入并执行 setter,此时 formfield / ti-item 自己的视图都还没完成创建 → 一调 `detectChanges()` 就触发断言(dev 报 `"Should be run in update mode"`,prod 报 `Cannot read properties of null`)。

Angular 20 严格分离 renderView(创建)与 refreshView(更新):创建相只建 DOM/实例/常量初始化、不求值动态表达式;更新相(refreshView)才执行 `ɵɵproperty` 写绑定值,此时视图已离开创建模式,`detectChanges()` 合法。

**方案**:把 label 一律变成**方括号绑定**(编译为更新相的 `ɵɵproperty`),让它随其他输入在更新相写入,创建相不碰 setter → 不崩。`extensions[0].transformNode`(见 [config.ts](config.ts))在 TiFormField 分支统一包装 TiItem 时,对字符串 label 包成单引号字面量表达式,让通用 handleBinding 输出:

- 原本输出(崩):`<ti-item label="姓名" [required]="true">`(字符串字面量走 `resolveBindingRight` 的 static 分支)
- 改为(不崩):`<ti-item [label]="'姓名'" [required]="true">`(包成 `{ type: 'JSExpression', value: "'姓名'" }` 后落入 `[key]="..."` 分支)

字符串与表达式两种情形都覆盖:JSExpression label(`this.state.xxx` 等)原样保留,handleBinding 本就输出 `[label]="expr"`;数字/布尔/对象/数组字面量经 `resolveBindingRight` 也落在 `[label]="..."` / `[label]='...'` 绑定上,均在更新相写入,无需特判。

**转义顺序**(写入 value 时):先 `\` → `\\`,再 `'` → `\'`(Angular 表达式词法支持 `\'` 与 `\\`),最后 `"` → `&quot;`(产物落在外层双引号属性内,不提前闭合;HTML 实体解析先于表达式词法,还原回的 `"` 在单引号串内合法)。

**连带清理**:原出码内部产物 `TiItemLabel`(`<ti-item-label>`,由 transformNode 合成、曾随物料包 `components`/`modules` 注册)已随本方案删除——不再合成该节点,物料包映射回归只含真实组件,无需任何注册。

**为什么钩子是「就地改写、不要 return」**:出码器的扩展钩子签名是 `(node) => void`,而 TS 允许把**有返回值**的函数赋给 void 返回位置,于是 `return node.children.map(...)` 能编译通过却什么都不改——出码器没有 errors 通道,漏包 TiItem 只能等 Angular 运行期崩,极难倒查。所以出码器在调用处加了守卫,发现返回非 `undefined` 就直接抛错。写这个钩子时**改 `node.children` 本身**,别返回新数组。

---
