# TinyNG 组件特判记录

本文记录 TinyNG 出码时对特定组件做特殊处理的原因与对应实现:

| 组件 | 特殊处理 | 实现位置 |
| --- | --- | --- |
| TiPagination | `total` → `totalNumber` | `propRename`(见 [config.ts](config.ts)) |
| TiTable | `srcData.state` 归一化(字符串→对象 + 缺省字段补全) | `transformState`(见 [config.ts](config.ts)) |
| TiItem | `label` 属性 → `<ti-item-label>` 子元素 | `transformChildren`(见 [config.ts](config.ts)) |
| TiPagination | `pageSizes`/`pageSize` 合并为单个 `[pageSize]="{ options, size }"` | `propAdapters`(见 [prop-adapters.ts](prop-adapters.ts)) |
| TiTable | `displayedData`/`srcData` 绑定形态 | `propAdapters`(见 [prop-adapters.ts](prop-adapters.ts)) |

## 启动测试界面

```bash
pnpm dev:angular-test
```

---

## 1. TiPagination:`total` → `totalNumber`

**问题**:AI 输出的 schema JSON 中包含属性 `total`,而 TinyNG 的 `<ti-pagination>` 支持的是 `totalNumber`,不是 `total`:

```json
{
  "componentName": "TinyPagination",
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

**处理**:`propRename`(见 [config.ts](config.ts))。

---

## 2. TiTable:`srcData.state` 归一化

**问题**:`srcData` 是 `<ti-table>` 组件的一个必需属性。AI 返回的 schema JSON 中的 `srcData` 如下:

```json
{
  "srcData": {
    "data": [
      {
        "id": "1",
        "name": "张三",
        "department": "人事部",
        "position": "人事专员",
        "email": "zhangsan@example.com",
        "phone": "13800138001"
      },
      {
        "id": "2",
        "name": "李四",
        "department": "技术部",
        "position": "前端工程师",
        "email": "lisi@example.com",
        "phone": "13800138002"
      }
    ],
    "state": "paginated"
  }
}
```

然而,TinyNG 要求 `srcData.state` 是 `TiTableSrcState` 类型,不能是字符串:

```ts
interface TiTableSrcState {
  paginated: boolean,
  searched: boolean,
  sorted: boolean
}
```

schema 中 `"state": "paginated"` 表示启用声明式分页(同理 `"searched"` / `"sorted"`,可逗号或空格组合),但字符串形式与 TinyNG 类型不兼容,必须在出码前归一化为对象:

```json
{ "paginated": true, "searched": false, "sorted": false }
```

**处理**:`transformState`(见 [config.ts](config.ts)),在 state 遍历/序列化前对 `srcData.state` 归一化:

- 字符串:按声明式特性枚举拆分为对象,命中的特性置 `true`,其余置 `false`;
- 对象:补全缺失字段为 `false`(表格声明式搜索/排序/分页需要,兼容旧行为);
- 其他(`undefined` / 非对象非字符串):原样保留。

---

## 3. TiItem:`label` 属性不能直接绑定

**崩溃根因**(Angular 20):`TiItemComponent.setItemLabel` 在设置 `label` 属性时调用 `this.formfield.changeDetector.detectChanges()` 与 `this.changeDetector.detectChanges()`。而 `<ti-item label="姓名">` 的 `label` 是静态属性输入,会在视图**创建期**(create pass)被写入,此时 formfield / ti-item 自己的视图都还没完成创建 → 一调 `detectChanges()` 就触发断言(dev 报 `"Should be run in update mode"`,prod 报 `Cannot read properties of null`)。

Angular 20 严格分离 renderView(创建)与 refreshView(更新),refreshView 开头断言目标视图不能在创建模式。

**解决方案**:改用 `<ti-item-label>` 子元素后,`label` 的写入发生在 `TiItemLabelComponent.ngAfterContentInit`(content hooks 阶段 = 更新期),此时所有子视图已完成创建,`detectChanges()` 合法。

**处理**:`transformChildren`(见 [config.ts](config.ts)),TiFormField 分支统一包装 TiItem 时,把 `label` 属性剥离为第一个子元素 `<ti-item-label>`(其余 props 如 `required` / `show` / `verticalAlign` / `rowspan` / `colspan` / `index` 照旧):

- 原本输出(崩):`<ti-item label="姓名" [required]="true">`
- 改为(不崩):`<ti-item [required]="true"><ti-item-label>姓名</ti-item-label>...`

**补充**:因为 `<ti-item-label>` 注入的是 DOM 节点,内容可以是富文本(如 `<ti-item-label><span style="color:red">姓名</span></ti-item-label>`)。`labelWidth` 等 formfield 属性不受影响。`TiItemLabel` 不在物料包(内部组件),标签经 hyphenate 兜底为 `ti-item-label`,模块由已导入的 `TiFormfieldModule` 提供,无需额外 import。

---

## 4. TiPagination:`pageSizes` / `pageSize` 合并为单个 `[pageSize]` 对象绑定

**问题**:TinyNG 的 `<ti-pagination>` 用一个 `[pageSize]` 输入接收 `{ options: number[], size: number }` 对象(选项列表 + 当前选中值);而 AI 输出的 schema 把同一份信息拆成了两个 prop:`pageSizes`(字面量数组,选项列表)与 `pageSize`(通常是 JSExpression,如 `this.state.pageSize`)。

**处理**:`propAdapters`(见 [prop-adapters.ts](prop-adapters.ts))中的两个 adapter 协作,把两个 prop 重新并回一个对象绑定:

- `PageSizesAdapter`(消费 `pageSizes`):把选项数组与兄弟 `pageSize` 合并为 `[pageSize]="{ options: [...], size: ... }"`,size 取 `pageSize` 的表达式值,无表达式时兜底为 `options[0] || 10`;
- `PageSizeAdapter`(消费 `pageSize`):若 props 已含 `pageSizes`,说明已被上面的绑定合并消费,直接 `return true` 吞掉(不再产出,避免模板出现两个 `[pageSize]` 冲突);否则单独包成 `[pageSize]="{ size: ... }"`。

| schema 中的形式 | 最终模板 |
| --- | --- |
| `pageSizes` + `pageSize`(JSExpression) | `[pageSize]="{ options: [10, 20, 50, 100], size: state.pageSize }"` |
| 仅 `pageSize`(JSExpression) | `[pageSize]="{ size: state.pageSize }"` |
| 仅 `pageSizes` | `[pageSize]="{ options: [10, 20, 50, 100], size: 10 }"` |

**原因**:adapter 机制按 prop 逐个尝试、命中即消费,`pageSizes` 与 `pageSize` 是**两个不同的键**,每个键只会被触发一次,必须拆成两个 adapter 各守一键;两者靠 `'pageSizes' in props` 协调 —— 该判断读**原始 props 对象**而非已生成的 attrsArr,因此与遍历顺序无关。
