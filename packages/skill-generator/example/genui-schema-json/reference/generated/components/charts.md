# 图表组件

白名单：`TinyHuichartsLine`, `TinyHuichartsHistogram`, `TinyHuichartsBar`, `TinyHuichartsRadar`, `TinyHuichartsRing`, `TinyHuichartsPie`, `TinyHuichartsFunnel`, `TinyHuichartsScatter`, `TinyHuichartsWaterfall`, `TinyHuichartsGauge`, `TinyHuichartsGraph`, `TinyHuichartsProcess`

```json
[
  {
    "name": "折线图",
    "component": "TinyHuichartsLine",
    "description": "折线图",
    "schema": {
      "properties": [
        {
          "property": "options",
          "description": "折线图配置",
          "properties": [
            {
              "property": "color",
              "description": "颜色, 类型Array"
            },
            {
              "property": "data",
              "description": "图表数据",
              "defaultValue": []
            },
            {
              "property": "dataZoom",
              "description": "区域缩放轴"
            },
            {
              "property": "itemStyle",
              "description": "数据点文本样式"
            },
            {
              "property": "padding",
              "description": "图表内边距"
            },
            {
              "property": "theme",
              "description": "主题"
            },
            {
              "property": "tooltip",
              "description": "悬浮提示框内容配置"
            },
            {
              "property": "xAxis",
              "description": "默认值：图表数据data中data[0]对象的第一个key值",
              "defaultValue": {}
            },
            {
              "property": "yAxis",
              "description": "配置y轴",
              "defaultValue": {}
            }
          ]
        }
      ],
      "events": [],
      "slots": {}
    }
  },
  {
    "name": "柱状图",
    "component": "TinyHuichartsHistogram",
    "description": "柱状图",
    "schema": {
      "properties": [
        {
          "property": "options",
          "description": "柱状图配置",
          "properties": [
            {
              "property": "color",
              "description": "颜色, 类型Array"
            },
            {
              "property": "data",
              "description": "图表数据",
              "defaultValue": [
                {
                  "Month": "",
                  "val": ""
                }
              ]
            },
            {
              "property": "dataRules",
              "description": "数据规则"
            },
            {
              "property": "dataZoom",
              "description": "区域缩放轴"
            },
            {
              "property": "direction",
              "description": "柱体方向"
            },
            {
              "property": "itemStyle",
              "description": "柱体样式"
            },
            {
              "property": "label",
              "description": "柱体文本，默认不显示"
            },
            {
              "property": "legend",
              "description": "图例配置，默认显示"
            },
            {
              "property": "lineDataName",
              "description": "柱状图更改为折线图的数据名"
            },
            {
              "property": "markline",
              "description": "阈值线配置"
            },
            {
              "property": "padding",
              "description": "图表内边距"
            },
            {
              "property": "theme",
              "description": "主题"
            },
            {
              "property": "tooltip",
              "description": "悬浮提示框内容配置"
            },
            {
              "property": "type",
              "description": "柱状图类型"
            },
            {
              "property": "xAxis",
              "description": "默认值：图表数据data中data[0]对象的第一个key值",
              "defaultValue": {
                "data": ""
              }
            },
            {
              "property": "yAxis",
              "description": "配置y轴",
              "defaultValue": {}
            }
          ]
        }
      ],
      "events": [
        {
          "event": "onReady",
          "functionInfo": {
            "params": [],
            "returns": {}
          },
          "description": "图表渲染完成后触发，每次渲染都会触发一次"
        },
        {
          "event": "onReadyOnce",
          "functionInfo": {
            "params": [],
            "returns": {}
          },
          "description": "图表渲染完成后触发，只会在首次渲染完成后触发"
        }
      ],
      "slots": {}
    }
  },
  {
    "name": "条形图",
    "component": "TinyHuichartsBar",
    "description": "条形图",
    "schema": {
      "properties": [
        {
          "property": "options",
          "description": "条形图配置",
          "properties": [
            {
              "property": "color",
              "description": "颜色, 类型Array"
            },
            {
              "property": "data",
              "description": "图表数据",
              "defaultValue": []
            },
            {
              "property": "dataZoom",
              "description": "区域缩放轴"
            },
            {
              "property": "itemStyle",
              "description": "柱体样式"
            },
            {
              "property": "padding",
              "description": "图表内边距"
            },
            {
              "property": "theme",
              "description": "主题"
            },
            {
              "property": "tooltip",
              "description": "悬浮提示框内容配置"
            },
            {
              "property": "xAxis",
              "description": "默认值：图表数据data中data[0]对象的第一个key值",
              "defaultValue": {}
            },
            {
              "property": "yAxis",
              "description": "配置y轴",
              "defaultValue": {}
            }
          ]
        }
      ],
      "events": [
        {
          "event": "onReady",
          "functionInfo": {
            "params": [],
            "returns": {}
          },
          "description": "图表渲染完成后触发，每次渲染都会触发一次"
        },
        {
          "event": "onReadyOnce",
          "functionInfo": {
            "params": [],
            "returns": {}
          },
          "description": "图表渲染完成后触发，只会在首次渲染完成后触发"
        }
      ],
      "slots": {}
    }
  },
  {
    "name": "雷达图",
    "component": "TinyHuichartsRadar",
    "description": "雷达图",
    "schema": {
      "properties": [
        {
          "property": "options",
          "description": "雷达图配置",
          "properties": [
            {
              "property": "color",
              "description": "颜色, 类型Array"
            },
            {
              "property": "data",
              "description": "图表数据",
              "defaultValue": {}
            },
            {
              "property": "area",
              "description": "图形区域配置"
            },
            {
              "property": "radar",
              "description": "坐标系配置",
              "defaultValue": {
                "triggerEvent": true
              }
            },
            {
              "property": "position",
              "description": "图表位置及大小"
            },
            {
              "property": "theme",
              "description": "主题"
            },
            {
              "property": "tooltip",
              "description": "悬浮提示框内容配置"
            }
          ]
        }
      ],
      "events": [
        {
          "event": "onReady",
          "functionInfo": {
            "params": [],
            "returns": {}
          },
          "description": "图表渲染完成后触发，每次渲染都会触发一次"
        },
        {
          "event": "onReadyOnce",
          "functionInfo": {
            "params": [],
            "returns": {}
          },
          "description": "图表渲染完成后触发，只会在首次渲染完成后触发"
        }
      ],
      "slots": [
        {
          "event": "default",
          "description": "组件默认插槽"
        }
      ]
    }
  },
  {
    "name": "环形图",
    "component": "TinyHuichartsRing",
    "description": "环形图",
    "schema": {
      "properties": [
        {
          "property": "options",
          "description": "环形图配置",
          "properties": [
            {
              "property": "color",
              "description": "颜色, 类型Array"
            },
            {
              "property": "data",
              "description": "图表数据",
              "defaultValue": []
            },
            {
              "property": "position",
              "description": "图表位置及大小"
            },
            {
              "property": "itemStyle",
              "description": "描边配置"
            },
            {
              "property": "title",
              "description": "中心文本配置"
            },
            {
              "property": "theme",
              "description": "主题"
            },
            {
              "property": "tooltip",
              "description": "悬浮提示框内容配置"
            }
          ]
        }
      ],
      "events": [
        {
          "event": "onReady",
          "functionInfo": {
            "params": [],
            "returns": {}
          },
          "description": "图表渲染完成后触发，每次渲染都会触发一次"
        },
        {
          "event": "onReadyOnce",
          "functionInfo": {
            "params": [],
            "returns": {}
          },
          "description": "图表渲染完成后触发，只会在首次渲染完成后触发"
        }
      ],
      "slots": [
        {
          "event": "default",
          "description": "组件默认插槽"
        }
      ]
    }
  },
  {
    "name": "圆盘图",
    "component": "TinyHuichartsPie",
    "description": "圆盘图",
    "schema": {
      "properties": [
        {
          "property": "options",
          "description": "圆盘图配置",
          "properties": [
            {
              "property": "color",
              "description": "颜色, 类型Array"
            },
            {
              "property": "data",
              "description": "图表数据",
              "defaultValue": []
            },
            {
              "property": "title",
              "description": "中心文本配置"
            },
            {
              "property": "itemStyle",
              "description": "描边配置"
            },
            {
              "property": "position",
              "description": "图表位置及大小"
            },
            {
              "property": "theme",
              "description": "主题"
            },
            {
              "property": "tooltip",
              "description": "悬浮提示框内容配置"
            }
          ]
        }
      ],
      "events": [],
      "slots": {}
    }
  },
  {
    "name": "漏斗图",
    "component": "TinyHuichartsFunnel",
    "description": "漏斗图",
    "schema": {
      "properties": [
        {
          "property": "options",
          "description": "漏斗图配置",
          "properties": [
            {
              "property": "color",
              "description": "颜色, 类型Array"
            },
            {
              "property": "data",
              "description": "图表数据",
              "defaultValue": []
            },
            {
              "property": "position",
              "description": "图表位置"
            },
            {
              "property": "size",
              "description": "图表大小"
            },
            {
              "property": "theme",
              "description": "主题"
            },
            {
              "property": "tooltip",
              "description": "悬浮提示框内容配置"
            }
          ]
        }
      ],
      "events": [],
      "slots": {}
    }
  },
  {
    "name": "散点图",
    "component": "TinyHuichartsScatter",
    "description": "散点图",
    "schema": {
      "properties": [
        {
          "property": "options",
          "description": "散点图配置",
          "properties": [
            {
              "property": "color",
              "description": "颜色, 类型Array"
            },
            {
              "property": "data",
              "description": "图表数据"
            },
            {
              "property": "bubbleSize",
              "description": "气泡大小范围"
            },
            {
              "property": "itemStyle",
              "description": "节点图形样式"
            },
            {
              "property": "padding",
              "description": "图表内边距"
            },
            {
              "property": "theme",
              "description": "主题"
            },
            {
              "property": "tooltip",
              "description": "悬浮提示框内容配置"
            },
            {
              "property": "xAxis",
              "description": "默认值：图表数据data中data[0]对象的第一个key值",
              "defaultValue": {}
            },
            {
              "property": "yAxis",
              "description": "配置y轴",
              "defaultValue": {}
            }
          ]
        }
      ],
      "events": [],
      "slots": {}
    }
  },
  {
    "name": "瀑布图",
    "component": "TinyHuichartsWaterfall",
    "description": "瀑布图",
    "schema": {
      "properties": [
        {
          "property": "options",
          "description": "瀑布图配置",
          "properties": [
            {
              "property": "color",
              "description": "颜色, 类型Array"
            },
            {
              "property": "data",
              "description": "图表数据",
              "defaultValue": []
            },
            {
              "property": "dataZoom",
              "description": "区域缩放轴"
            },
            {
              "property": "itemStyle",
              "description": "柱体样式"
            },
            {
              "property": "padding",
              "description": "图表内边距"
            },
            {
              "property": "theme",
              "description": "主题"
            },
            {
              "property": "tooltip",
              "description": "悬浮提示框内容配置"
            },
            {
              "property": "xAxis",
              "description": "默认值：图表数据data中data[0]对象的第一个key值",
              "defaultValue": {}
            },
            {
              "property": "yAxis",
              "description": "配置y轴",
              "defaultValue": {}
            }
          ]
        }
      ],
      "events": [],
      "slots": {}
    }
  },
  {
    "name": "仪表盘",
    "component": "TinyHuichartsGauge",
    "description": "仪表盘",
    "schema": {
      "properties": [
        {
          "property": "options",
          "description": "仪表盘配置",
          "properties": [
            {
              "property": "color",
              "description": "颜色, 类型Array"
            },
            {
              "property": "data",
              "description": "图表数据",
              "defaultValue": []
            },
            {
              "property": "startAngle",
              "description": "仪表盘起始角度。圆心正右手侧为 0 度，正上方为 90 度，正左手侧为 180 度",
              "type": "number"
            },
            {
              "property": "endAngle",
              "description": "仪表盘结束角度。圆心正右手侧为 0 度，正上方为 90 度，正左手侧为 180 度",
              "type": "number"
            },
            {
              "property": "min",
              "description": "仪表盘的最小值",
              "type": "number"
            },
            {
              "property": "max",
              "description": "仪表盘的最大值",
              "type": "number"
            },
            {
              "property": "pointer",
              "description": "刻度指针是否显示",
              "type": "boolean"
            },
            {
              "property": "splitColor",
              "description": "仪表盘的分割颜色，splitColor[i][0] 的值代表整根轴线的百分比，应在 0 到 1 之间, splitColor[i][1] 是对应的颜色",
              "defaultValue": []
            },
            {
              "property": "theme",
              "description": "主题"
            },
            {
              "property": "tooltip",
              "description": "悬浮提示框内容配置"
            }
          ]
        }
      ],
      "events": [],
      "slots": {}
    }
  },
  {
    "name": "拓扑图",
    "component": "TinyHuichartsGraph",
    "description": "拓扑图",
    "schema": {
      "properties": [
        {
          "property": "options",
          "description": "拓扑图配置",
          "properties": [
            {
              "property": "series",
              "description": "图表数据",
              "defaultValue": []
            },
            {
              "property": "animationEasing",
              "description": "初始动画的缓动效果",
              "type": "string"
            },
            {
              "property": "animationEasingUpdate",
              "description": "更新动画的缓动效果",
              "type": "string"
            },
            {
              "property": "animationDurationUpdate",
              "description": "数据更新动画的时长",
              "type": "number"
            },
            {
              "property": "animationDelayUpdate",
              "description": "数据更新动画的延迟",
              "type": "number"
            }
          ]
        }
      ],
      "events": [],
      "slots": {}
    }
  },
  {
    "name": "进度图",
    "component": "TinyHuichartsProcess",
    "description": "进度图",
    "schema": {
      "properties": [
        {
          "property": "options",
          "description": "进度图配置",
          "properties": [
            {
              "property": "color",
              "description": "颜色, 类型Array"
            },
            {
              "property": "data",
              "description": "图表数据",
              "defaultValue": []
            },
            {
              "property": "name",
              "description": "图表数据, 已有默认值，禁止设置name"
            },
            {
              "property": "state",
              "description": "根据状态设置颜色"
            },
            {
              "property": "padding",
              "description": "图表内边距"
            },
            {
              "property": "theme",
              "description": "主题"
            },
            {
              "property": "tooltip",
              "description": "悬浮提示框内容配置"
            }
          ]
        }
      ],
      "events": [],
      "slots": {}
    }
  }
]
```
