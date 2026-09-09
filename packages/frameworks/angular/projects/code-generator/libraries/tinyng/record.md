# TinyNG 组件特判记录

本文记录 TinyNG 出码时对特定组件做特殊处理的原因与对应实现:

| 组件 | 特殊处理 | 实现位置 |
| --- | --- | --- |
| TiPagination | `total` → `totalNumber` | 已删:物料包 meta 定义修正为 `totalNumber`(见 meta/bundle.json、examples/pagination.json) |
| TiTable | `srcData.state` 归一化(字符串→对象 + 缺省字段补全) | 已删:物料包示例把 `srcData.state` 补成对象形式(见 meta/examples/grid.json、pagination.json) |
| TiItem | `label` 属性 → `<ti-item-label>` 子元素 | `transformChildren`(见 [config.ts](config.ts)) |
| TiPagination | `pageSizes`/`pageSize` → 单个 `pageSize` 对象 `{ options, size }` | 已删:物料包 meta 定义与示例改为单 `pageSize` 对象(见 meta/bundle.json、meta/examples/pagination.json) |
| TiTable | `displayedData` 双向 / `srcData` 单绑(原特判,现通用规则覆盖) | `handleBinding` 通用 `model:true`(见[第 5 节](#5-modeltrue-双向约定非表单组件默认出--key)) |

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

## 3. TiItem:`label` 属性不能直接绑定

**崩溃根因**(Angular 20):`TiItemComponent.setItemLabel` 在设置 `label` 属性时调用 `this.formfield.changeDetector.detectChanges()` 与 `this.changeDetector.detectChanges()`。而 `<ti-item label="姓名">` 的 `label` 是静态属性输入,会在视图**创建期**(create pass)被写入,此时 formfield / ti-item 自己的视图都还没完成创建 → 一调 `detectChanges()` 就触发断言(dev 报 `"Should be run in update mode"`,prod 报 `Cannot read properties of null`)。

Angular 20 严格分离 renderView(创建)与 refreshView(更新),refreshView 开头断言目标视图不能在创建模式。

**解决方案**:改用 `<ti-item-label>` 子元素后,`label` 的写入发生在 `TiItemLabelComponent.ngAfterContentInit`(content hooks 阶段 = 更新期),此时所有子视图已完成创建,`detectChanges()` 合法。

**处理**:`transformChildren`(见 [config.ts](config.ts)),TiFormField 分支统一包装 TiItem 时,把 `label` 属性剥离为第一个子元素 `<ti-item-label>`(其余 props 如 `required` / `show` / `verticalAlign` / `rowspan` / `colspan` / `index` 照旧):

- 原本输出(崩):`<ti-item label="姓名" [required]="true">`
- 改为(不崩):`<ti-item [required]="true"><ti-item-label>姓名</ti-item-label>...`

**补充**:因为 `<ti-item-label>` 注入的是 DOM 节点,内容可以是富文本(如 `<ti-item-label><span style="color:red">姓名</span></ti-item-label>`)。`labelWidth` 等 formfield 属性不受影响。`TiItemLabel` 已随物料包 `components`/`modules` 注册(见 angular-opentiny-ng 的 `ng-components.ts`),出码器需要的 selector(`ti-item-label`)、归属模块(`TiFormfieldModule`)由 map 自动推导带出,不再手工补齐;它**不进 meta**(bundle.json/白名单),因为是出码内部产物,不应作为可作者化组件教给模型。

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

## 5. `model:true` 双向约定:非表单组件默认出 `[(key)]`

**约定**(`handleBinding`,见 [angular-code-generator.ts](../angular-code-generator.ts)):schema 中带 `model:true` 的 JSExpression 表示"该属性要双向同步"。Angular 生态的双向有两种实现形态,据此分流:

| 组件形态 | 产物 | 依据 |
| --- | --- | --- |
| CVA 表单控件(`config.formComponents` 名单内) | `[(ngModel)]="expr"` | ngModel 是组件级指令,绑整值、不落单 prop |
| 其余全部(默认) | `[(key)]="expr"` | banana-box 约定 `@Input key` + `@Output keyChange` |

`key` 为 rename 后的真实属性名,如 TiTable `displayedData` → `[(displayedData)]`。

**为什么默认取 `[(key)]` 而非 `[(ngModel)]`**:绝大多数双向属性(表格 `displayedData` 等)遵循 `key/keyChange` 命名,一套通用规则即可覆盖,无需按 prop 逐条特判;只有 CVA 表单控件必须靠 `ngModel`(它是整组件机制,`model:true` 无法从 prop 键推断),故仅需在 `IAngularLibraryConfig.formComponents` 列出组件名集合。

**连带删除**:原 `DisplayedDataAdapter`(TiTable displayedData 双向特判)与 `SrcDataAdapter`(srcData 强制单绑)被此规则取代 —— `displayedData` 现落入通用 `[(key)]`,`srcData`(无 `model`)落入通用 `[key]`,产物不变。原 `TiPagination` 两个 adapter(`pageSizes`/`pageSize` 合并为 `{ options, size }`)亦已删除 —— 该值形态改由物料包 meta/示例直接写对(见[第 4 节](#4-tipaginationpagesizes--pagesize-已统一为单个-pagesize-对象已在物料包修正出码器不再特判)),`prop-adapters.ts` 文件随之移除,`config.ts` 不再配置 `propAdapters`。若未来组件库确有通用规则无法覆盖的形态重塑特判,仍可复用 `prop-adapter.ts` 抽象按库注入。

**注意**:依赖"AI 输出的 `model:true` 必然对应库中真实存在的 `key/keyChange` 双向属性"。当前无 TinyNG 表单控件出码样例,`formComponents` 留空;待需出表单控件时,需把 CVA 组件(TiInput/TiSelect/TiDate/…)加入名单,否则会被误当作 banana-box 出 `[(key)]` 而编译失败。
