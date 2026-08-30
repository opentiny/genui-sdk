# TinyNG 组件特判记录

本文记录 TinyNG 出码时对特定组件做特殊处理的原因与对应实现:
- `total` → `totalNumber`:`propRename`(见 [config.ts](config.ts))
- TiTable `srcData.state` 归一化(字符串→对象 + 缺省字段补全):`transformState`(见 [config.ts](config.ts))
- TiItem `label` 属性 → `<ti-item-label>` 子元素:`transformChildren`(见 [config.ts](config.ts))
- JSSlot 列渲染:slot 模板机制(见 angular-code-generator-base.ts)
- 其余 prop 特判:`propAdapters`(见 [prop-adapters.ts](prop-adapters.ts))

启动测试界面:
```
pnpm dev:angular-test
```

1、<ti-pagination>组件，ai输出的schema json中包含属性"total"，而TinyNg的ti-pagination支持的是"totalNumber"属性，而不是"total"
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

2、JSSlot
{
  "componentName": "TiTable",
  "props": { "columns": [
    { "title": "操作", "render": {
        "type": "JSSlot", "params": ["row"],
        "value": [{ "componentName": "TiButton", "props": { "text": "删除" } }] } }
  ] }
}



import { Component, ViewChild, TemplateRef, OnInit } from '@angular/core';
// ...
export class SchemaCardComponent implements OnInit {
  @ViewChild('slot0', { static: true }) slot0!: TemplateRef<any>;
  columns: any = [];

  ngOnInit(): void {
    this.columns = [ { "title": "操作", "render": this.slot0 } ];
  }
}
// template:
// <ti-table [columns]="columns"></ti-table>
// <ng-template #slot0 let-row><button tiButton text="删除"></button></ng-template>

3、<ti-table>组件
srcData是ti-table组件的一个必需属性，AI返回的schema json中的srcData如下， 
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
    },
    ],
    "state": "paginated"
},

然而，TinyNg 要求 srcData.state 是 TiTableSrcState 类型，不能是字符串：
interface TiTableSrcState {
    paginated: boolean,
    searched: boolean,
    sorted: boolean
}

schema 中 "state": "paginated" 表示启用声明式分页（同理 "searched" / "sorted"，可逗号或空格组合），
但字符串形式与 TinyNG 类型不兼容，必须在出码前归一化为对象：
{ "paginated": true, "searched": false, "sorted": false }

特殊处理位置：`transformState`（见 [config.ts](config.ts)），在 state 遍历/序列化前对 srcData.state 归一化：
- 字符串：按声明式特性枚举拆分为对象，命中的特性置 true，其余置 false；
- 对象：补全缺失字段为 false（表格声明式搜索/排序/分页需要，兼容旧行为）；
- 其他（undefined / 非对象非字符串）：原样保留。

4、<ti-item> 的 label 属性不能直接绑定

崩溃根因（Angular 20）：TiItemComponent.setItemLabel 在设置 label 属性时调用
`this.formfield.changeDetector.detectChanges()` 与 `this.changeDetector.detectChanges()`。
而 `<ti-item label="姓名">` 的 label 是静态属性输入，会在视图**创建期**（create pass）被写入，
此时 formfield / ti-item 自己的视图都还没完成创建 → 一调 detectChanges() 就触发断言
（dev 报 "Should be run in update mode"，prod 报 Cannot read properties of null）。

Angular 20 严格分离 renderView（创建）与 refreshView（更新），refreshView 开头断言目标视图不能在创建模式。

改用 `<ti-item-label>` 子元素后，label 的写入发生在 TiItemLabelComponent.ngAfterContentInit
（content hooks 阶段 = 更新期），此时所有子视图已完成创建，detectChanges() 合法。

特殊处理位置：`transformChildren`（见 [config.ts](config.ts)），TiFormField 分支统一包装 TiItem 时，
把 label 属性剥离为第一个子元素 `<ti-item-label>`（其余 props 如 required/show/verticalAlign/rowspan/colspan/index 照旧）：
- 原本输出（崩）：`<ti-item label="姓名" [required]="true">`
- 改为（不崩）：`<ti-item [required]="true"><ti-item-label>姓名</ti-item-label>...`

因为 `<ti-item-label>` 注入的是 DOM 节点，内容可以是富文本（如 `<ti-item-label><span style="color:red">姓名</span></ti-item-label>`）。
labelWidth 等 formfield 属性不受影响。TiItemLabel 不在物料包（内部组件），标签经 hyphenate 兜底为 `ti-item-label`，
模块由已导入的 TiFormfieldModule 提供，无需额外 import。





