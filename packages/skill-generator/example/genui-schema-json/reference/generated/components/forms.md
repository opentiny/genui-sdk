# 表单组件

白名单：`input`, `TinyForm`, `TinyFormItem`, `TinyButton`, `TinyInput`, `TinyRadio`, `TinyRadioGroup`, `TinySelect`, `TinySwitch`, `TinyNumeric`, `TinyCheckbox`, `TinyCheckboxButton`, `TinyCheckboxGroup`, `TinyDatePicker`

```json
[
  {
    "name": "输入框",
    "component": "input",
    "description": "输入框",
    "schema": {
      "properties": [
        {
          "property": "type",
          "description": "类型"
        },
        {
          "property": "placeholder",
          "description": "占位符"
        },
        {
          "property": "attributes3",
          "description": "原生属性"
        }
      ],
      "events": [
        {
          "event": "onBlur",
          "functionInfo": {
            "params": [
              {
                "name": "event",
                "type": "Object",
                "description": {
                  "zh_CN": "原生 event"
                }
              }
            ],
            "returns": {}
          },
          "description": "在 Input 失去焦点时触发"
        },
        {
          "event": "onFocus",
          "functionInfo": {
            "params": [
              {
                "name": "event",
                "type": "Object",
                "description": {
                  "zh_CN": "原生 event"
                }
              }
            ],
            "returns": {}
          },
          "description": "在 Input 获取焦点时触发"
        },
        {
          "event": "onChange",
          "functionInfo": {
            "params": [
              {
                "name": "event",
                "type": "Object",
                "description": {
                  "zh_CN": "原生 event"
                }
              }
            ],
            "returns": {}
          },
          "description": "在 Input 输入值改变时触发"
        }
      ],
      "slots": {}
    }
  },
  {
    "name": "表单",
    "component": "TinyForm",
    "description": "由按钮、输入框、选择器、单选框、多选框等控件组成，用以收集、校验、提交数据",
    "schema": {
      "properties": [
        {
          "property": "disabled",
          "description": "是否禁用"
        },
        {
          "property": "labelWidth",
          "description": "表单中标签占位宽度，默认为 80px"
        },
        {
          "property": "inline",
          "description": "行内布局模式，默认为 false"
        },
        {
          "property": "labelAlign",
          "description": "必填标识 * 是否占位"
        },
        {
          "property": "labelSuffix",
          "description": "表单中标签后缀"
        },
        {
          "property": "labelPosition",
          "description": "表单中标签的布局位置"
        },
        {
          "property": "model",
          "description": "表单数据对象"
        },
        {
          "property": "rules",
          "description": "表单验证规则"
        }
      ],
      "events": [
        {
          "event": "onValidate",
          "functionInfo": {
            "params": [
              {
                "name": "function",
                "type": "Function",
                "description": {
                  "zh_CN": "校验回调函数"
                }
              }
            ],
            "returns": {}
          },
          "description": "表单项被校验后触发"
        },
        {
          "event": "onInput",
          "functionInfo": {
            "params": [
              {
                "name": "value",
                "type": "string",
                "description": {
                  "zh_CN": "输入框输入的值"
                }
              }
            ],
            "returns": {}
          },
          "description": "在 Input 输入值改变时触发"
        },
        {
          "event": "onBlur",
          "functionInfo": {
            "params": [
              {
                "name": "event",
                "type": "Object",
                "description": {
                  "zh_CN": "原生 event"
                }
              }
            ],
            "returns": {}
          },
          "description": "在 Input 失去焦点时触发"
        },
        {
          "event": "onFocus",
          "functionInfo": {
            "params": [
              {
                "name": "event",
                "type": "Object",
                "description": {
                  "zh_CN": "原生 event"
                }
              }
            ],
            "returns": {}
          },
          "description": "在 Input 获取焦点时触发"
        },
        {
          "event": "onClear",
          "functionInfo": {
            "params": [],
            "returns": {}
          },
          "description": "点击清空按钮时触发"
        }
      ],
      "slots": {}
    }
  },
  {
    "name": "表单项",
    "component": "TinyFormItem",
    "description": "由按钮、输入框、选择器、单选框、多选框等控件组成，用以收集、校验、提交数据, 必须放在 TinyForm 中使用， 可以是直接子元素或者间接子元素",
    "schema": {
      "properties": [
        {
          "property": "label",
          "description": "标签文本"
        },
        {
          "property": "prop",
          "description": "表单域 model 字段，在使用 validate、resetFields 方法的情况下，该属性是必填的"
        },
        {
          "property": "required",
          "description": "是否必填"
        }
      ],
      "events": [],
      "slots": [
        {
          "event": "label",
          "description": "自定义显示字段名称"
        }
      ]
    }
  },
  {
    "name": "按钮",
    "component": "TinyButton",
    "description": "常用的操作按钮，提供包括默认按钮、图标按钮、图片按钮、下拉按钮等类型",
    "schema": {
      "properties": [
        {
          "property": "text",
          "description": "按钮文字",
          "type": "string"
        },
        {
          "property": "size",
          "description": "按钮大小",
          "type": "select"
        },
        {
          "property": "disabled",
          "description": "是否被禁用"
        },
        {
          "property": "type",
          "description": "设置不同的主题样式"
        },
        {
          "property": "icon",
          "description": "按钮图标，必须使用 JSSlot 包裹 TinyIcon。正确示例：{\"type\":\"JSSlot\",\"value\":[{\"componentName\":\"TinyIcon\",\"props\":{\"name\":\"IconSearch\"}}]}。禁止直接传组件对象或使用 JSExpression。",
          "type": "object"
        },
        {
          "property": "round",
          "description": "是否圆角按钮"
        },
        {
          "property": "plain",
          "description": "是否为朴素按钮"
        },
        {
          "property": "reset-time",
          "description": "设置禁用时间，防止重复提交，单位毫秒"
        },
        {
          "property": "circle",
          "description": "是否圆形按钮"
        },
        {
          "property": "autofocus",
          "description": "是否默认聚焦"
        },
        {
          "property": "loading",
          "description": "是否展示位加载中样式"
        }
      ],
      "events": [
        {
          "event": "onClick",
          "functionInfo": {
            "params": [],
            "returns": {}
          },
          "description": "按钮被点击时触发的回调函数"
        }
      ],
      "slots": {}
    }
  },
  {
    "name": "输入框",
    "component": "TinyInput",
    "description": "通过鼠标或键盘输入字符",
    "schema": {
      "properties": [
        {
          "property": "modelValue",
          "description": "双向绑定值"
        },
        {
          "property": "type",
          "description": "设置input框的type属性"
        },
        {
          "property": "rows",
          "description": "输入框行数，只对 type='textarea' 有效"
        },
        {
          "property": "placeholder",
          "description": "输入框占位文本"
        },
        {
          "property": "clearable",
          "description": "是否显示清除按钮"
        },
        {
          "property": "disabled",
          "description": "是否禁用"
        },
        {
          "property": "size",
          "description": "输入框尺寸。该属性的可选值为： medium 、small 、 mini"
        },
        {
          "property": "maxlength",
          "description": "设置 input 框的maxLength"
        },
        {
          "property": "autofocus",
          "description": "自动获取焦点"
        }
      ],
      "events": [
        {
          "event": "onChange",
          "functionInfo": {
            "params": [
              {
                "name": "value",
                "type": "string",
                "description": {
                  "zh_CN": "输入框改变后的值"
                }
              }
            ],
            "returns": {}
          },
          "description": "在 Input 值改变时触发"
        },
        {
          "event": "onInput",
          "functionInfo": {
            "params": [
              {
                "name": "value",
                "type": "string",
                "description": {
                  "zh_CN": "输入框输入的值"
                }
              }
            ],
            "returns": {}
          },
          "description": "在 Input 输入值改变时触发"
        },
        {
          "event": "onUpdate:modelValue",
          "functionInfo": {
            "params": [
              {
                "name": "value",
                "type": "string",
                "description": {
                  "zh_CN": "双向绑定的值"
                }
              }
            ],
            "returns": {}
          },
          "description": "在 Input 输入值改变时触发"
        },
        {
          "event": "onBlur",
          "functionInfo": {
            "params": [
              {
                "name": "event",
                "type": "Object",
                "description": {
                  "zh_CN": "原生 event"
                }
              }
            ],
            "returns": {}
          },
          "description": "在 Input 失去焦点时触发"
        },
        {
          "event": "onFocus",
          "functionInfo": {
            "params": [
              {
                "name": "event",
                "type": "Object",
                "description": {
                  "zh_CN": "原生 event"
                }
              }
            ],
            "returns": {}
          },
          "description": "在 Input 获取焦点时触发"
        },
        {
          "event": "onClear",
          "functionInfo": {
            "params": [],
            "returns": {}
          },
          "description": "点击清空按钮时触发"
        }
      ],
      "slots": [
        {
          "event": "prefix",
          "description": "前置内容"
        },
        {
          "event": "suffix",
          "description": "后置内容"
        }
      ]
    }
  },
  {
    "name": "单选",
    "component": "TinyRadio",
    "description": "用于配置不同场景的选项，在一组备选项中进行单选",
    "schema": {
      "properties": [
        {
          "property": "text",
          "description": "单选框文本内容"
        },
        {
          "property": "label",
          "description": "radio 选中时的值"
        },
        {
          "property": "modelValue",
          "description": "双向绑定的当前选中值"
        },
        {
          "property": "disabled",
          "description": "是否禁用"
        },
        {
          "property": "border",
          "description": "是否显示边框"
        },
        {
          "property": "size",
          "description": "单选框的尺寸，仅在 border 为true时有效"
        },
        {
          "property": "name",
          "description": "原生 name 属性"
        }
      ],
      "events": [
        {
          "event": "onChange",
          "description": "绑定值变化时触发的事件"
        },
        {
          "event": "onUpdate:modelValue",
          "functionInfo": {
            "params": [
              {
                "name": "value",
                "type": "string",
                "description": {
                  "zh_CN": "双向绑定的当前选中值"
                }
              }
            ],
            "returns": {}
          },
          "description": "当前选中的值改变时触发"
        }
      ],
      "slots": {}
    }
  },
  {
    "name": "单选按钮组",
    "component": "TinyRadioGroup",
    "description": "用于在一组选项中进行单选。",
    "schema": {
      "properties": [
        {
          "property": "modelValue",
          "description": "单选框组的绑定值"
        },
        {
          "property": "options",
          "description": "单选按钮选项列表，配置单选组的值、文本和点击事件。示例：[{label: '1', text: '选项1', events: {click: () => {console.log('点击选项1')}}}]",
          "defaultValue": []
        },
        {
          "property": "disabled",
          "description": "是否禁用整个单选组"
        },
        {
          "property": "type",
          "description": "单选组的展示形式,可选值为：radio(单选框) 、 button(按钮、选项式)"
        },
        {
          "property": "size",
          "description": "单选组尺寸, 可选值有 medium 、 small 、 mini"
        },
        {
          "property": "vertical",
          "description": "是否垂直展示单选按钮"
        }
      ],
      "events": [
        {
          "event": "onChange",
          "functionInfo": {
            "params": [
              {
                "name": "value",
                "type": "string",
                "defaultValue": "",
                "description": {
                  "zh_CN": "当前选中的值"
                }
              }
            ],
            "returns": {}
          },
          "description": "选中值变化时触发"
        },
        {
          "event": "onUpdate:modelValue",
          "functionInfo": {
            "params": [
              {
                "name": "value",
                "type": "string",
                "defaultValue": "",
                "description": {
                  "zh_CN": "更新后的绑定值"
                }
              }
            ],
            "returns": {}
          },
          "description": "v-model 对应的值更新时触发"
        }
      ],
      "slots": {}
    }
  },
  {
    "name": "下拉框",
    "component": "TinySelect",
    "description": "Select 选择器是一种通过点击弹出下拉列表展示数据并进行选择的 UI 组件",
    "schema": {
      "properties": [
        {
          "property": "modelValue",
          "description": "双向绑定的当前选中值"
        },
        {
          "property": "placeholder",
          "description": "输入框占位文本"
        },
        {
          "property": "clearable",
          "description": "是否显示清除按钮"
        },
        {
          "property": "searchable",
          "description": "下拉面板是否可搜索"
        },
        {
          "property": "disabled",
          "description": "是否禁用"
        },
        {
          "property": "options",
          "description": "配置 Select 下拉数据项",
          "defaultValue": []
        },
        {
          "property": "tooltipConfig",
          "description": "悬浮提示配置，默认不显示",
          "defaultValue": {
            "always": false
          }
        },
        {
          "property": "multiple",
          "description": "是否允许输入框输入或选择多个项"
        },
        {
          "property": "multiple-limit",
          "description": "多选时用户最多可以选择的项目数，为 0 则不限制"
        },
        {
          "property": "popper-class",
          "description": "设置下拉框自定义的类名"
        },
        {
          "property": "collapse-tags",
          "description": "多选时是否将选中值按文字的形式展示"
        }
      ],
      "events": [
        {
          "event": "onChange",
          "functionInfo": {
            "params": [
              {
                "name": "value",
                "type": "string",
                "description": {
                  "zh_CN": "下拉框选中项的值"
                }
              }
            ],
            "returns": {}
          },
          "description": "在下拉框值改变时触发"
        },
        {
          "event": "onUpdate:modelValue",
          "functionInfo": {
            "params": [
              {
                "name": "value",
                "type": "string",
                "description": {
                  "zh_CN": "双向绑定的当前选中值"
                }
              }
            ],
            "returns": {}
          },
          "description": "当前选中的值改变时触发"
        },
        {
          "event": "onBlur",
          "functionInfo": {
            "params": [
              {
                "name": "event",
                "type": "Object",
                "description": {
                  "zh_CN": "原生 event"
                }
              }
            ],
            "returns": {}
          },
          "description": "在 Input 失去焦点时触发"
        },
        {
          "event": "onFocus",
          "functionInfo": {
            "params": [
              {
                "name": "event",
                "type": "Object",
                "description": {
                  "zh_CN": "原生 event"
                }
              }
            ],
            "returns": {}
          },
          "description": "在 Input 获取焦点时触发"
        },
        {
          "event": "onClear",
          "functionInfo": {
            "params": [],
            "returns": {}
          },
          "description": "点击清空按钮时触发"
        },
        {
          "event": "onRemoveTag",
          "functionInfo": {
            "params": [
              {
                "name": "value",
                "type": "Object",
                "description": {
                  "zh_CN": "被移除Tag对应数据项的值字段"
                }
              }
            ],
            "returns": {}
          },
          "description": "多选模式下移除tag时触发"
        }
      ],
      "slots": {}
    }
  },
  {
    "name": "开关",
    "component": "TinySwitch",
    "description": "Switch 在两种状态间切换选择",
    "schema": {
      "properties": [
        {
          "property": "disabled",
          "description": "是否被禁用"
        },
        {
          "property": "modelValue",
          "description": "绑定默认值"
        },
        {
          "property": "true-value",
          "description": "设置打开时的值，类型为：Boolean | String | Number"
        },
        {
          "property": "false-value",
          "description": "设置关闭时的值，类型为：Boolean | String | Number"
        },
        {
          "property": "mini",
          "description": "是否显示为 mini 模式"
        }
      ],
      "events": [
        {
          "event": "onChange",
          "functionInfo": {
            "params": [],
            "returns": {}
          },
          "description": "按钮被点击时触发的回调函数"
        },
        {
          "event": "onUpdate:modelValue",
          "functionInfo": {
            "params": [
              {
                "name": "value",
                "type": "string",
                "description": {
                  "zh_CN": "双向绑定的开关状态值"
                }
              }
            ],
            "returns": {}
          },
          "description": "开关的状态值改变时触发"
        }
      ],
      "slots": {}
    }
  },
  {
    "name": "数字输入框",
    "component": "TinyNumeric",
    "description": "通过鼠标或键盘输入字符",
    "schema": {
      "properties": [
        {
          "property": "modelValue",
          "description": "双向绑定值"
        },
        {
          "property": "placeholder",
          "description": "输入框占位文本"
        },
        {
          "property": "allow-empty",
          "description": "是否内容可清空"
        },
        {
          "property": "disabled",
          "description": "是否禁用"
        },
        {
          "property": "size",
          "description": "输入框尺寸。该属性的可选值为： medium 、small 、 mini"
        },
        {
          "property": "controls",
          "description": "是否使用加减按钮"
        },
        {
          "property": "controls-position",
          "description": "加减按钮位置"
        },
        {
          "property": "precision",
          "description": "数值精度"
        },
        {
          "property": "step",
          "description": "步长"
        },
        {
          "property": "max",
          "description": "可输入的最大数值"
        },
        {
          "property": "min",
          "description": "可输入的最大数值"
        }
      ],
      "events": [
        {
          "event": "onChange",
          "functionInfo": {
            "params": [
              {
                "name": "value",
                "type": "string",
                "description": {
                  "zh_CN": "输入框改变后的值"
                }
              }
            ],
            "returns": {}
          },
          "description": "在 Input 值改变时触发"
        },
        {
          "event": "onInput",
          "functionInfo": {
            "params": [
              {
                "name": "value",
                "type": "string",
                "description": {
                  "zh_CN": "输入框输入的值"
                }
              }
            ],
            "returns": {}
          },
          "description": "在 Input 输入值改变时触发"
        },
        {
          "event": "onUpdate:modelValue",
          "functionInfo": {
            "params": [
              {
                "name": "value",
                "type": "string",
                "description": {
                  "zh_CN": "双向绑定的值"
                }
              }
            ],
            "returns": {}
          },
          "description": "在 Input 输入值改变时触发"
        },
        {
          "event": "onBlur",
          "functionInfo": {
            "params": [
              {
                "name": "event",
                "type": "Object",
                "description": {
                  "zh_CN": "原生 event"
                }
              }
            ],
            "returns": {}
          },
          "description": "在 Input 失去焦点时触发"
        },
        {
          "event": "onFocus",
          "functionInfo": {
            "params": [
              {
                "name": "event",
                "type": "Object",
                "description": {
                  "zh_CN": "原生 event"
                }
              }
            ],
            "returns": {}
          },
          "description": "在 Input 获取焦点时触发"
        },
        {
          "event": "onClear",
          "functionInfo": {
            "params": [],
            "returns": {}
          },
          "description": "点击清空按钮时触发"
        }
      ],
      "slots": {}
    }
  },
  {
    "name": "复选框",
    "component": "TinyCheckbox",
    "description": "用于配置不同场景的选项，提供用户可在一组选项中进行多选",
    "schema": {
      "properties": [
        {
          "property": "modelValue",
          "description": "双向绑定值"
        },
        {
          "property": "disabled",
          "description": "是否禁用"
        },
        {
          "property": "checked",
          "description": "当前是否勾选"
        },
        {
          "property": "text",
          "description": "复选框的文本"
        },
        {
          "property": "border",
          "description": "是否显示边框"
        },
        {
          "property": "false-label",
          "description": "没有选中时的值"
        },
        {
          "property": "true-label",
          "description": "选中时的值"
        }
      ],
      "events": [
        {
          "event": "onChange",
          "functionInfo": {
            "params": [
              {
                "name": "value",
                "type": "string",
                "description": {
                  "zh_CN": "选中项的值"
                }
              }
            ],
            "returns": {}
          },
          "description": "勾选值改变后将触发"
        },
        {
          "event": "onUpdate:modelValue",
          "functionInfo": {
            "params": [
              {
                "name": "value",
                "type": "string",
                "description": {
                  "zh_CN": "双向绑定的当前选中值"
                }
              }
            ],
            "returns": {}
          },
          "description": "当前选中的值改变时触发"
        }
      ],
      "slots": {}
    }
  },
  {
    "name": "复选按钮",
    "component": "TinyCheckboxButton",
    "description": "用于配置不同场景的选项，提供用户可在一组选项中进行多选",
    "schema": {
      "properties": [
        {
          "property": "modelValue",
          "description": "双向绑定的当前选中值"
        },
        {
          "property": "disabled",
          "description": "是否禁用"
        },
        {
          "property": "checked",
          "description": "当前是否勾选"
        },
        {
          "property": "text",
          "description": "按钮文本"
        }
      ],
      "events": [
        {
          "event": "onChange",
          "functionInfo": {
            "params": [
              {
                "name": "value",
                "type": "string",
                "description": {
                  "zh_CN": "选中项的值"
                }
              }
            ],
            "returns": {}
          },
          "description": "勾选值改变后将触发"
        },
        {
          "event": "onUpdate:modelValue",
          "functionInfo": {
            "params": [
              {
                "name": "value",
                "type": "array",
                "description": {
                  "zh_CN": "双向绑定的当前选中值"
                }
              }
            ],
            "returns": {}
          },
          "description": "当前选中的值改变时触发"
        }
      ],
      "slots": {}
    }
  },
  {
    "name": "复选按钮组",
    "component": "TinyCheckboxGroup",
    "description": "用于配置不同场景的选项，提供用户可在一组选项中进行多选",
    "schema": {
      "properties": [
        {
          "property": "modelValue",
          "description": "双向绑定的当前选中值"
        },
        {
          "property": "disabled",
          "description": "是否禁用"
        },
        {
          "property": "options",
          "description": "checkbox组件列表"
        },
        {
          "property": "type",
          "description": "checkbox组件类型（button/checkbox），该属性的默认值为 checkbox,配合 options 属性一起使用"
        }
      ],
      "events": [
        {
          "event": "onChange",
          "functionInfo": {
            "params": [
              {
                "name": "value",
                "type": "string",
                "description": {
                  "zh_CN": "选中项的值"
                }
              }
            ],
            "returns": {}
          },
          "description": "勾选值改变后将触发"
        },
        {
          "event": "onUpdate:modelValue",
          "functionInfo": {
            "params": [
              {
                "name": "value",
                "type": "array",
                "description": {
                  "zh_CN": "双向绑定的当前选中值"
                }
              }
            ],
            "returns": {}
          },
          "description": "当前选中的值改变时触发"
        }
      ],
      "slots": {}
    }
  },
  {
    "name": "日期选择",
    "component": "TinyDatePicker",
    "description": "用于输入或选择日期",
    "schema": {
      "properties": [
        {
          "property": "modelValue",
          "description": "双向绑定值"
        },
        {
          "property": "type",
          "description": "设置日期框的type属性"
        },
        {
          "property": "placeholder",
          "description": "输入框占位文本"
        },
        {
          "property": "clearable",
          "description": "是否显示清除按钮"
        },
        {
          "property": "disabled",
          "description": "是否禁用"
        },
        {
          "property": "readonly",
          "description": "是否只读"
        },
        {
          "property": "size",
          "description": "日期框尺寸。该属性的可选值为： medium 、 small 、 mini"
        },
        {
          "property": "maxlength",
          "description": "设置 input 框的maxLength"
        },
        {
          "property": "autofocus",
          "description": "自动获取焦点"
        }
      ],
      "events": [
        {
          "event": "onChange",
          "functionInfo": {
            "params": [
              {
                "name": "value",
                "type": "string",
                "description": {
                  "zh_CN": "输入框改变后的值"
                }
              }
            ],
            "returns": {}
          },
          "description": "在 Input 值改变时触发"
        },
        {
          "event": "onInput",
          "functionInfo": {
            "params": [
              {
                "name": "value",
                "type": "string",
                "description": {
                  "zh_CN": "输入框输入的值"
                }
              }
            ],
            "returns": {}
          },
          "description": "在 Input 输入值改变时触发"
        },
        {
          "event": "onUpdate:modelValue",
          "functionInfo": {
            "params": [
              {
                "name": "value",
                "type": "string",
                "description": {
                  "zh_CN": "双向绑定的值"
                }
              }
            ],
            "returns": {}
          },
          "description": "在 Input 输入值改变时触发"
        },
        {
          "event": "onBlur",
          "functionInfo": {
            "params": [
              {
                "name": "event",
                "type": "Object",
                "description": {
                  "zh_CN": "原生 event"
                }
              }
            ],
            "returns": {}
          },
          "description": "在 Input 失去焦点时触发"
        },
        {
          "event": "onFocus",
          "functionInfo": {
            "params": [
              {
                "name": "event",
                "type": "Object",
                "description": {
                  "zh_CN": "原生 event"
                }
              }
            ],
            "returns": {}
          },
          "description": "在 Input 获取焦点时触发"
        },
        {
          "event": "onClear",
          "functionInfo": {
            "params": [],
            "returns": {}
          },
          "description": "点击清空按钮时触发"
        }
      ],
      "slots": {}
    }
  }
]
```
