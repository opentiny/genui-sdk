# 数据展示

白名单：`TinyGrid`, `TinyPager`

```json
[
  {
    "name": "表格",
    "component": "TinyGrid",
    "description": "提供了非常强大数据表格功能，可以展示数据列表，可以对数据列表进行选择、编辑等",
    "schema": {
      "properties": [
        {
          "property": "data",
          "description": "设置表格的数据（静态数据）。与 fetchData 互斥，配置其一即可"
        },
        {
          "property": "columns",
          "description": "表格列配置，需优先于 data 生成。列常用字段：title/field/width/type/sortable/showOverflow",
          "properties": [
            {
              "property": "title",
              "description": "列标题",
              "type": "string"
            },
            {
              "property": "field",
              "description": "列对应的数据字段名",
              "type": "string"
            },
            {
              "property": "sortable",
              "description": "该列是否可排序，默认 false",
              "type": "boolean"
            },
            {
              "property": "width",
              "description": "列宽，可为整数、px、%、auto",
              "type": "string"
            },
            {
              "property": "formatText",
              "description": "内置渲染器",
              "type": "string"
            },
            {
              "property": "renderer",
              "description": "列渲染配置函数，自定义渲染内容，优先级高于formatText",
              "type": "object"
            },
            {
              "property": "slots",
              "description": "插槽配置信息，可以配置多个插槽，比如：header、default等, 参数有row(行数据)，column(列数据)，$table(内部表格实例)，seq(序号)，cell(单元格)，columnIndex(列索引)，$rowIndex(行索引)， 需要在params数组声明后使用，使用时直接使用变量即可",
              "type": "object"
            },
            {
              "property": "type",
              "description": "内置列类型：index（序号）、selection（复选）、radio（单选）、expand（展开行）、operation（操作列）"
            },
            {
              "property": "editor",
              "description": "单元格编辑渲染配置项，也可以是函数 Function(h, params)"
            },
            {
              "property": "filter",
              "description": "设置表格列的筛选配置信息。默认值为 false 不配置筛选信息"
            },
            {
              "property": "showOverflow",
              "description": "设置内置列的内容超出部分显示省略号配置，该属性的可选值为： ellipsis(只显示省略号） 、 title(显示为原生 title) 、 tooltip(显示为 tooltip 提示）"
            }
          ]
        },
        {
          "property": "fetchData",
          "description": "服务端数据查询方法，如 { api: () => Promise }。与 data 互斥，需配合 pager 使用"
        },
        {
          "property": "pager",
          "description": "分页配置，需结合 fetchData。写法如 { attrs: { currentPage 当前页, pageSize 每页条数, pageSizes 可选每页条数数组, total 总条数, layout 布局如 \"total, prev, pager, next, jumper\" } }"
        },
        {
          "property": "resizable",
          "description": "是否允许调整列宽，默认 true"
        },
        {
          "property": "row-id",
          "description": "自定义行数据唯一主键字段名（默认 _RID，行数据需有唯一主键，默认自动生成）"
        },
        {
          "property": "select-config",
          "description": "行复选框配置，需配合列 type=selection。常用字段：trigger 勾选触发方式（cell 点单元格 / row 点整行，默认点复选框图标）；labelField 复选框旁显示的字段名；checkRowKeys 初始化默认勾选的行主键数组（依赖 row-id）；checkMethod函数配置是否可选 返回 false 则该行不可勾选；checkAll 初始化是否全选；showHeader 表头是否显示全选框；"
        },
        {
          "property": "edit-rules",
          "description": "编辑校验规则，配合 edit-config 与列 editor 使用。按字段名配置规则数组，如 { name: [{ required: true, message: \"必填\" }, { min: 2, max: 10, message: \"长度 2-10\" }] }"
        },
        {
          "property": "edit-config",
          "description": "表格编辑配置。常用字段：trigger 激活方式（click / dblclick / manual）；mode 编辑粒度（cell 单元格 / row 整行）；showStatus 是否显示编辑状态标记；activeMethod({row, column}) 返回 false 则禁止编辑该单元格/行"
        },
        {
          "property": "expand-config",
          "description": "展开行配置，需配合列 type=expand。常用字段：expandAll 是否默认展开全部；trigger 展开触发方式（default 点图标 / cell 点单元格 / row 点整行）；expandRowKeys 默认展开的行主键数组（依赖 row-id）；accordion 同级是否只能展开一行；activeMethod({row}) 返回 false 则不渲染该行展开区；showIcon 是否显示展开图标"
        },
        {
          "property": "sortable",
          "description": "是否允许列数据排序。默认为 true 可排序"
        },
        {
          "property": "auto-resize",
          "description": "表格属性设置 autoResize 属性开启响应式表格宽高的同时，将高度height设置为auto就可以自动跟随父容器高度。"
        },
        {
          "property": "border",
          "description": "是否带有纵向边框"
        },
        {
          "property": "seq-serial",
          "description": "行序号是否连续，开启分页时有效，默认 false"
        },
        {
          "property": "row-class-name",
          "description": "给行附加 className，可为 string 或函数 ({seq, row, rowIndex, $rowIndex, column, columnIndex}) => string"
        },
        {
          "property": "max-height",
          "description": "表格内容区（不含表头/表尾）最大高度，支持整数、px、%"
        },
        {
          "property": "row-span",
          "description": "简易行合并：传入要合并的字段列表，如 [{ field: \"area\" }, { field: \"province\" }]，相邻且值相同的单元格会自动合并。仅普通表格可用，不可与 tree-config 同用；更复杂合并请用 span-method"
        }
      ],
      "events": [
        {
          "event": "onFilterChange",
          "functionInfo": {
            "params": [
              {
                "name": "args",
                "type": "Object",
                "description": {
                  "zh_CN": "{$table(表格实例), filters(过滤条件)}"
                }
              }
            ],
            "returns": {}
          },
          "description": "当筛选条件发生变化时触发。开启 remote-filter 时会走服务端过滤并调用 fetch-data"
        },
        {
          "event": "onSortChange",
          "functionInfo": {
            "params": [
              {
                "name": "args",
                "type": "Object",
                "description": {
                  "zh_CN": "{$table(表格实例), field(排序字段), order(排序方向)}，order 为 asc|desc"
                }
              }
            ],
            "returns": {}
          },
          "description": "点击列头执行数据排序前触发。开启 remote-sort 时会走服务端排序并调用 fetch-data"
        },
        {
          "event": "onSelectAll",
          "functionInfo": {
            "params": [
              {
                "name": "args",
                "type": "Object",
                "description": {
                  "zh_CN": "{$table(表格实例), checked(是否选中), selection(选中数据), row(选中行数据)}"
                }
              },
              {
                "name": "event",
                "type": "Event",
                "description": {
                  "zh_CN": "原生 Event"
                }
              }
            ],
            "returns": {}
          },
          "description": "只对 type=selection 有效，当手动勾选全选时触发的事件"
        },
        {
          "event": "onSelectChange",
          "functionInfo": {
            "params": [
              {
                "name": "args",
                "type": "Object",
                "description": {
                  "zh_CN": "表格选中相关信息对象, { $table(表格实例), selection(选中数据), row(选中行数据), checked(是否选中), rowIndex(选中行索引) }"
                }
              },
              {
                "name": "event",
                "type": "Event",
                "description": {
                  "zh_CN": "原生 Event"
                }
              }
            ],
            "returns": {}
          },
          "description": "只对 type=selection 有效，当手动勾选并且值发生改变时触发的事件"
        },
        {
          "event": "onToggleExpandChange",
          "functionInfo": {
            "params": [
              {
                "name": "args",
                "type": "Object",
                "description": {
                  "zh_CN": "{$table(表格实例), row(行数据), rowIndex(行索引)}"
                }
              },
              {
                "name": "event",
                "type": "Event",
                "description": {
                  "zh_CN": "原生 Event"
                }
              }
            ],
            "returns": {}
          },
          "description": "当行展开或收起时触发"
        }
      ],
      "slots": {}
    }
  },
  {
    "name": "分页",
    "component": "TinyPager",
    "description": "当数据量过多时，使用分页分解数据，常用于 Grid 和 Repeater 组件",
    "schema": {
      "properties": [
        {
          "property": "currentPage",
          "description": "当前页数，支持 .sync 修饰符"
        },
        {
          "property": "pageSize",
          "description": "每页显示条目个数"
        },
        {
          "property": "pageSizes",
          "description": "设置可选择的每页显示条数"
        },
        {
          "property": "total",
          "description": "数据总条数"
        },
        {
          "property": "layout",
          "description": "组件布局，子组件名用逗号分隔"
        }
      ],
      "events": [
        {
          "event": "onCurrentChange ",
          "functionInfo": {
            "params": [
              {
                "name": "value",
                "type": "string",
                "description": {
                  "zh_CN": "当前页的值"
                }
              }
            ],
            "returns": {}
          },
          "description": "切换页码时触发"
        },
        {
          "event": "onPrevClick ",
          "functionInfo": {
            "params": [
              {
                "name": "page",
                "type": "String",
                "description": {
                  "zh_CN": "当前页的页码值"
                }
              }
            ],
            "returns": {}
          },
          "description": "点击上一页按钮时触发"
        },
        {
          "event": "onNextClick",
          "functionInfo": {
            "params": [
              {
                "name": "page",
                "type": "String",
                "description": {
                  "zh_CN": "当前页的页码值"
                }
              }
            ],
            "returns": {}
          },
          "description": "点击上一页按钮时触发"
        }
      ],
      "slots": {}
    }
  }
]
```
