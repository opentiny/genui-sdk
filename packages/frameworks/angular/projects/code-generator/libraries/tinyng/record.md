# TinyNG 组件特判记录

本文记录 TinyNG 出码时对特定组件做特殊处理的原因与对应实现:
- `total` → `totalNumber`:`propRename`(见 [config.ts](config.ts))
- TiTable `srcData.state` 补全:`transformState`(见 [config.ts](config.ts))
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

然而，TinyNg 要求 srcData.state是TiTableSrcState类型：
interface TiTableSrcState {
    paginated: boolean,
    searched: boolean,
    sorted: boolean
},
所以需要对"state": "paginated"进行处理。





