# TinyNG 组件特判记录

本文记录 TinyNG 出码时对特定组件做特殊处理的原因与对应实现:

| 组件 | 特殊处理 | 实现位置 |
| --- | --- | --- |
| TiPagination | `total` → `totalNumber` | 已删:物料包 meta 定义修正为 `totalNumber`(见 meta/bundle.json、examples/pagination.json) |
| TiTable | `srcData.state` 归一化(字符串→对象 + 缺省字段补全) | 已删:物料包示例把 `srcData.state` 补成对象形式(见 meta/examples/grid.json、pagination.json) |
| TiItem | `label` → `[label]="'姓名'"` 绑定形式(字符串/表达式均以更新相写入) | `transformChildren`(见 [config.ts](config.ts)) |
| TiPagination | `pageSizes`/`pageSize` → 单个 `pageSize` 对象 `{ options, size }` | 已删:物料包 meta 定义与示例改为单 `pageSize` 对象(见 meta/bundle.json、meta/examples/pagination.json) |
| TiTable | `displayedData` 双向 / `srcData` 单绑(原特判,现通用规则覆盖) | `handleBinding` 通用 `model:true`(见[第 5 节](#5-modeltrue-双向约定统一出-key)) |

## 启动测试界面

```bash
pnpm dev:angular-test
```

---

## 1. TiPagination:`total` → `totalNumber`(已在物料包定义修正,出码器不再特判)

**问题**:AI 输出的 schema JSON 中包含属性 `total`,而 TinyNG 的 `<ti-pagination>` 支持的是 `totalNumber`,不是 `total`:

> 注:根因是物料包 meta 把分页属性名误写成了 `total`(见 angular-opentiny-ng 的 `meta/materials/bundle.json`、`meta/examples/pagination.json`),schema/AI 跟着错。现已把物料包定义改为 `totalNumber`,出码器不再需要 `propRename` 兜底(config.ts 中的条目已删除)。以下为原问题留档。

```json
{
  "componentName": "TiPagination",
  "props": {
    "currentPage": {
      "type": "JSExpression",
      "value": "this.state.currentPage"
    },
    "pageSize": {
      "type": "JSExpression",
      "value": "this.state.pageSize"
    },
    "total": {
      "type": "JSExpression",
      "value": "this.state.total"
    },
    "pageSizes": [10, 20, 50, 100],
    "layout": "sizes, prev, pager, next, jumper, total",
    "onCurrentPageChange": {
      "type": "JSExpression",
      "value": "this.handlePageChange"
    },
    "onPageSizeChange": {
      "type": "JSExpression",
      "value": "this.handlePageSizeChange"
    }
  }
}
```

**处理(已删)**:原靠 `propRename` 兜底;物料包定义已修正,`config.ts` 不再配置该项。

---

## 2. TiTable:`srcData.state` 归一化(已在物料包示例修正,出码器不再特判)

**问题**:`srcData` 是 `<ti-table>` 的一个必需属性,其中 `state` 字段表示表格数据状态。TinyNG 要求 `srcData.state` 是 `TiTableSrcState` 类型,不能是字符串:

```ts
interface TiTableSrcState {
  paginated: boolean,
  searched: boolean,
  sorted: boolean
}
```

> 注:根因是物料包示例(meta/examples/grid.json、pagination.json)中的 `srcData` 只写了 `data`,没给 `state` 对象,AI 没有正确样例可循,便把「启用的声明式特性」按自己的理解简写成了字符串(如 `"state": "paginated"`)。现已把两个示例的 `srcData.state` 补成规范的 TiTableSrcState 对象(grid 全 `false`,pagination 的 `paginated: true`),config.ts 中的 `transformState` 兜底已删除。以下为原问题留档。

schema 中 `"state": "paginated"` 表示启用声明式分页(同理 `"searched"` / `"sorted"`,可逗号或空格组合),但字符串形式与 TinyNG 类型不兼容,须归一化为对象:

```json
{ "paginated": true, "searched": false, "sorted": false }
```

**处理(已删)**:原靠 `config.ts` 的 `transformState`,在 state 遍历/序列化前对 `srcData.state` 归一化:

- 字符串:按声明式特性枚举拆分为对象,命中的特性置 `true`,其余置 `false`;
- 对象:补全缺失字段为 `false`(表格声明式搜索/排序/分页需要,兼容旧行为);
- 其他(`undefined` / 非对象非字符串):原样保留。

物料包示例已按对象形式给出 `state`,出码器不再配置该项。

---

## 3. TiItem:`label` 必须以 `[label]=` 绑定形式输出

**崩溃根因**(Angular 20):`TiItemComponent.setItemLabel` 在设置 `label` 属性时调用 `this.formfield.changeDetector.detectChanges()` 与 `this.changeDetector.detectChanges()`。而 `<ti-item label="姓名">` 的 `label` 是**静态属性输入**(编译为 `tNode.initialInputs`),会在视图**创建期**(create pass)被写入并执行 setter,此时 formfield / ti-item 自己的视图都还没完成创建 → 一调 `detectChanges()` 就触发断言(dev 报 `"Should be run in update mode"`,prod 报 `Cannot read properties of null`)。

Angular 20 严格分离 renderView(创建)与 refreshView(更新):创建相只建 DOM/实例/常量初始化、不求值动态表达式;更新相(refreshView)才执行 `ɵɵproperty` 写绑定值,此时视图已离开创建模式,`detectChanges()` 合法。

**方案**:把 label 一律变成**方括号绑定**(编译为更新相的 `ɵɵproperty`),让它随其他输入在更新相写入,创建相不碰 setter → 不崩。`transformChildren`(见 [config.ts](config.ts))在 TiFormField 分支统一包装 TiItem 时,对字符串 label 包成单引号字面量表达式,让通用 handleBinding 输出:

- 原本输出(崩):`<ti-item label="姓名" [required]="true">`(字符串字面量走 `resolveBindingRight` 的 static 分支)
- 改为(不崩):`<ti-item [label]="'姓名'" [required]="true">`(包成 `{ type: 'JSExpression', value: "'姓名'" }` 后落入 `[key]="..."` 分支)

字符串与表达式两种情形都覆盖:JSExpression label(`this.state.xxx` 等)原样保留,handleBinding 本就输出 `[label]="expr"`;数字/布尔/对象/数组字面量经 `resolveBindingRight` 也落在 `[label]="..."` / `[label]='...'` 绑定上,均在更新相写入,无需特判。

**转义顺序**(写入 value 时):先 `\` → `\\`,再 `'` → `\'`(Angular 表达式词法支持 `\'` 与 `\\`),最后 `"` → `&quot;`(产物落在外层双引号属性内,不提前闭合;HTML 实体解析先于表达式词法,还原回的 `"` 在单引号串内合法)。

**连带清理**:原出码内部产物 `TiItemLabel`(`<ti-item-label>`,由 transformChildren 合成、曾随物料包 `components`/`modules` 注册)已随本方案删除——不再合成该节点,物料包映射回归只含真实组件,无需任何注册。

---

## 4. TiPagination:`pageSizes` / `pageSize` 已统一为单个 `pageSize` 对象(已在物料包修正,出码器不再特判)

**问题**:TinyNG 的 `<ti-pagination>` 用一个 `[pageSize]` 输入接收 `{ options: number[], size: number }` 对象(选项列表 + 当前选中值),**没有 `pageSizes` 输入**。而物料包 meta(meta/bundle.json)把同一份信息拆成了两个可作者化属性:`pageSize`(数字,当前选中值)与 `pageSizes`(数组,选项列表),AI 照抄物料便输出两个 prop 的 schema,与真实组件 API 不符。

> 注:根因是物料包定义错误,并非 AI 输出本身;遵循「修自己错误」原则,在物料包内把形态直接写对,出码器无需再兜底。以下为原问题留档。

旧 schema(AI 照抄物料输出、与真实 API 不符):

```json
{
  "componentName": "TiPagination",
  "props": {
    "currentPage": 1,
    "pageSize": 10,
    "pageSizes": [10, 20, 50, 100]
  }
}
```

**修正(已删)**:原靠 `prop-adapters.ts` 的 `PageSizesAdapter` + `PageSizeAdapter` 在出码器里把两个 prop 并回一个对象绑定;现已删去两个 adapter 与 `TINY_NG_PROP_ADAPTERS` 注册(config.ts 不再配置 `propAdapters`)。

物料包 meta/示例/snippet 均改为单 `pageSize` 对象形态:

- meta/bundle.json:`pageSize` 属性描述为对象 `{ options: number[], size: number }`,删除 `pageSizes` 属性;
- meta/examples/pagination.json:props 写 `"pageSize": { "type": "JSExpression", "value": "this.state.pageSizeConfig" }`,state 里 `pageSizeConfig: { options: [10, 20, 50, 100], size: 10 }`(需要随运行时状态走时,整个配置对象放 state);
- snippet:`pageSize` 直接给字面量对象 `{ options: [10, 20, 50, 100], size: 10 }`。

AI 输出单对象 `pageSize` 后,落入通用绑定(`[pageSize]="pageSizeConfig"` / `[pageSize]='{ ... }'`),无需任何适配器。

**原 adapter 行为留档**:两个 adapter 各守一键,靠 `'pageSizes' in props` 协调 —— 该判断读**原始 props 对象**而非已生成的 attrsArr,因此与遍历顺序无关。

| schema 中的形式 | 最终模板 |
| --- | --- |
| `pageSizes` + `pageSize`(JSExpression) | `[pageSize]="{ options: [10, 20, 50, 100], size: state.pageSize }"` |
| 仅 `pageSize`(JSExpression) | `[pageSize]="{ size: state.pageSize }"` |
| 仅 `pageSizes` | `[pageSize]="{ options: [10, 20, 50, 100], size: 10 }"` |

---

## 5. `model:true` 双向约定:统一出 `[(key)]`

**约定**(`handleBinding`,见 [angular-code-generator.ts](../angular-code-generator.ts)):schema 中带 `model:true` 的 JSExpression 表示"该属性要双向同步",一律出 `[(key)]="expr"`(banana-box 约定 `@Input key` + `@Output keyChange`)。无 `model` 的 JSExpression 出单绑 `[key]="expr"`。

`key` 为 rename 后的真实属性名,如 TiTable `displayedData` → `[(displayedData)]`。

**表单控件同样走这条路**:ngModel 是 Angular 内置的**组件级指令**(绑整值、不落单 prop),CVA 控件(schema 中 `ngModel: { model: true }`)的 prop 键本身就写成 `ngModel`,故 `[(ngModel)]` 由本规则**自然产出**,无需出码器特判:

| schema | 产物 |
| --- | --- |
| `ngModel: { model: true, value: ... }` | `[(ngModel)]="..."` |
| `displayedData: { model: true, value: ... }` | `[(displayedData)]="..."` |
| `srcData: { value: ... }`(无 `model`) | `[srcData]="..."` |

> 曾按 `IAngularLibraryConfig.formComponents` 名单把 CVA 控件分流到硬编码的 `[(ngModel)]`,但该字段从未被任何库配置启用(TinyNG 也没配),且对键名为 `ngModel` 的 schema 两个分支输出完全相同 —— 属无效分支,已连同字段一并移除。若未来某库出现「`model:true` 但 prop 键非 `key/keyChange` 命名」的双向属性,再考虑恢复按库配置的特判入口。

**连带删除**:原 `DisplayedDataAdapter`(TiTable displayedData 双向特判)与 `SrcDataAdapter`(srcData 强制单绑)被此规则取代 —— `displayedData` 现落入通用 `[(key)]`,`srcData`(无 `model`)落入通用 `[key]`,产物不变。原 `TiPagination` 两个 adapter(`pageSizes`/`pageSize` 合并为 `{ options, size }`)亦已删除 —— 该值形态改由物料包 meta/示例直接写对(见[第 4 节](#4-tipaginationpagesizes--pagesize-已统一为单个-pagesize-对象已在物料包修正出码器不再特判)),`prop-adapters.ts` 文件随之移除,`config.ts` 不再配置 `propAdapters`。若未来组件库确有通用规则无法覆盖的形态重塑特判,仍可复用 `prop-adapter.ts` 抽象按库注入。

**注意**:本规则依赖"schema 中 `model:true` 的 prop 键,就是目标组件真实存在的双向属性名"。AI 若把双向属性写到别的键上(如给 `TiSelect` 输出 `value: { model: true }`),会出成 `[(value)]` 而编译失败 —— 这类问题应回到物料包 meta/示例里把键名写对,而不是在出码器加特判。

