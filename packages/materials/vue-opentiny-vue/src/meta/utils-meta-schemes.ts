import type { IUtilsMeta } from '@opentiny/genui-sdk-core';

/**
 * 物料 utils 的 typeSchema 描述（11 个 util）。
 *
 * 采用自定义 JSON Schema（非标准，描述代码调用）。typeSchema 的唯一消费点是 LLM prompt，
 * 运行时走 materials.utils 值注册链路，不读该字段。
 */
export const utilsMeta: IUtilsMeta[] = [
  {
    name: 'formatDate',
    description: '格式化日期时间，支持 YYYY/MM/DD/HH/mm/ss 占位符',
    typeSchema:
      '{\n  "type": "function",\n  "params": [\n    {\n      "name": "date",\n      "type": "union",\n      "types": [\n        "Date",\n        "number",\n        "string"\n      ]\n    },\n    {\n      "name": "format",\n      "type": "string",\n      "optional": true\n    }\n  ],\n  "returns": {\n    "type": "string"\n  }\n}',
    usage: "this.utils.formatDate(Date.now(), 'YYYY-MM-DD HH:mm')",
  },
  {
    name: 'dayjs',
    description: 'Day.js 日期时间库，返回 Dayjs 对象',
    typeSchema:
      '{\n  "type": "function",\n  "params": [\n    {\n      "name": "value",\n      "type": "union",\n      "types": [\n        "string",\n        "number",\n        "Date"\n      ],\n      "optional": true\n    }\n  ],\n  "returns": {\n    "type": "Dayjs",\n    "methods": [\n      {\n        "name": "add",\n        "params": [\n          {\n            "name": "value",\n            "type": "number"\n          },\n          {\n            "name": "unit",\n            "type": "string"\n          }\n        ],\n        "returns": "Dayjs"\n      },\n      {\n        "name": "subtract",\n        "params": [\n          {\n            "name": "value",\n            "type": "number"\n          },\n          {\n            "name": "unit",\n            "type": "string"\n          }\n        ],\n        "returns": "Dayjs"\n      },\n      {\n        "name": "format",\n        "params": [\n          {\n            "name": "template",\n            "type": "string",\n            "optional": true\n          }\n        ],\n        "returns": "string"\n      },\n      {\n        "name": "startOf",\n        "params": [\n          {\n            "name": "unit",\n            "type": "string"\n          }\n        ],\n        "returns": "Dayjs"\n      },\n      {\n        "name": "endOf",\n        "params": [\n          {\n            "name": "unit",\n            "type": "string"\n          }\n        ],\n        "returns": "Dayjs"\n      },\n      {\n        "name": "isBefore",\n        "params": [\n          {\n            "name": "other",\n            "type": "union",\n            "types": [\n              "Dayjs",\n              "string",\n              "number"\n            ]\n          }\n        ],\n        "returns": "boolean"\n      }\n    ]\n  }\n}',
    usage: "const d = this.utils.dayjs('2026-09-21'); d.startOf('month').isAfter(d.subtract(1, 'day'))",
  },
  {
    name: 'formatMoney',
    description: '格式化金额：千分位分隔 + 固定小数位',
    typeSchema:
      '{\n  "type": "function",\n  "overloads": [\n    {\n      "params": [\n        {\n          "name": "value",\n          "type": "number"\n        },\n        {\n          "name": "precision",\n          "type": "number",\n          "optional": true\n        },\n        {\n          "name": "symbol",\n          "type": "string",\n          "optional": true\n        }\n      ]\n    },\n    {\n      "params": [\n        {\n          "name": "value",\n          "type": "string"\n        },\n        {\n          "name": "symbol",\n          "type": "string",\n          "optional": true\n        }\n      ]\n    }\n  ],\n  "returns": {\n    "type": "string"\n  }\n}',
    usage: "this.utils.formatMoney(1234.5, 2, '¥')",
  },
  {
    name: 'cloneDeep',
    description: '深拷贝一个对象或数组，返回同类型新副本',
    typeSchema: '{\n  "type": "function",\n  "generic": "T",\n  "params": [\n    {\n      "name": "value",\n      "type": "T"\n    }\n  ],\n  "returns": {\n    "type": "T"\n  }\n}',
    usage: 'this.utils.cloneDeep(obj)',
  },
  {
    name: 'debounce',
    description: '防抖：延迟 wait 毫秒后执行，返回带 cancel/flush 的函数',
    typeSchema:
      '{\n  "type": "function",\n  "generic": "T",\n  "params": [\n    {\n      "name": "func",\n      "type": "T"\n    },\n    {\n      "name": "wait",\n      "type": "number",\n      "optional": true\n    }\n  ],\n  "returns": {\n    "type": "function",\n    "methods": [\n      {\n        "name": "cancel",\n        "params": [],\n        "returns": "void"\n      },\n      {\n        "name": "flush",\n        "params": [],\n        "returns": "unknown"\n      }\n    ]\n  }\n}',
    usage: 'const fn = this.utils.debounce(() => {}, 300); fn.cancel()',
  },
  {
    name: 'throttle',
    description: '节流：wait 毫秒内最多执行一次',
    typeSchema:
      '{\n  "type": "function",\n  "generic": "T",\n  "params": [\n    {\n      "name": "func",\n      "type": "T"\n    },\n    {\n      "name": "wait",\n      "type": "number",\n      "optional": true\n    }\n  ],\n  "returns": {\n    "type": "function",\n    "methods": [\n      {\n        "name": "cancel",\n        "params": [],\n        "returns": "void"\n      },\n      {\n        "name": "flush",\n        "params": [],\n        "returns": "unknown"\n      }\n    ]\n  }\n}',
    usage: 'this.utils.throttle(() => {}, 300)',
  },
  {
    name: 'isNil',
    description: '判断值是否为 null 或 undefined',
    typeSchema: '{\n  "type": "function",\n  "params": [\n    {\n      "name": "value",\n      "type": "unknown"\n    }\n  ],\n  "returns": {\n    "type": "boolean"\n  }\n}',
    usage: 'this.utils.isNil(v)',
  },
  {
    name: 'get',
    description: '按路径安全读取对象属性，取不到时返回默认值',
    typeSchema:
      '{\n  "type": "function",\n  "params": [\n    {\n      "name": "object",\n      "type": "object"\n    },\n    {\n      "name": "path",\n      "type": "union",\n      "types": [\n        "string",\n        "string[]"\n      ]\n    },\n    {\n      "name": "defaultValue",\n      "type": "any",\n      "optional": true\n    }\n  ],\n  "returns": {\n    "type": "any"\n  }\n}',
    usage: "this.utils.get(obj, 'a.b', 0)",
  },
  {
    name: 'request',
    description: '通用请求函数，返回 Promise；method 仅 GET 或 POST',
    typeSchema:
      '{\n  "type": "function",\n  "generic": "T",\n  "params": [\n    {\n      "name": "options",\n      "type": "object",\n      "properties": [\n        {\n          "name": "url",\n          "type": "string"\n        },\n        {\n          "name": "method",\n          "type": "union",\n          "types": [\n            "GET",\n            "POST"\n          ],\n          "optional": true\n        },\n        {\n          "name": "data",\n          "type": "T",\n          "optional": true\n        }\n      ]\n    }\n  ],\n  "returns": {\n    "type": "Promise",\n    "of": "T"\n  }\n}',
    usage: "this.utils.request<{ id: number }>({ url: '/api/user', method: 'GET' })",
  },
  {
    name: 'Store',
    description: '泛型状态容器类，可用 new this.utils.Store(initial) 实例化',
    typeSchema:
      '{\n  "type": "class",\n  "name": "Store",\n  "generic": "T",\n  "constructors": [\n    {\n      "params": [\n        {\n          "name": "initial",\n          "type": "T"\n        }\n      ]\n    }\n  ],\n  "methods": [\n    {\n      "name": "getState",\n      "params": [],\n      "returns": "T"\n    },\n    {\n      "name": "setState",\n      "params": [\n        {\n          "name": "state",\n          "type": "T"\n        }\n      ],\n      "returns": "void"\n    },\n    {\n      "name": "subscribe",\n      "params": [\n        {\n          "name": "listener",\n          "type": "function",\n          "params": [\n            {\n              "name": "state",\n              "type": "T"\n            }\n          ],\n          "returns": "void"\n        }\n      ],\n      "returns": {\n        "type": "function",\n        "params": [],\n        "returns": "void"\n      }\n    }\n  ]\n}',
    usage: 'const s = new this.utils.Store(0); s.setState(1); s.subscribe((v) => {});',
  },
  {
    name: 'EventBus',
    description: '事件总线类，页面内组件间通信',
    typeSchema:
      '{\n  "type": "class",\n  "name": "EventBus",\n  "methods": [\n    {\n      "name": "on",\n      "params": [\n        {\n          "name": "event",\n          "type": "string"\n        },\n        {\n          "name": "handler",\n          "type": "function",\n          "params": [\n            {\n              "name": "args",\n              "variadic": true,\n              "type": "unknown"\n            }\n          ],\n          "returns": "void"\n        }\n      ],\n      "returns": {\n        "type": "function",\n        "params": [],\n        "returns": "void"\n      }\n    },\n    {\n      "name": "emit",\n      "params": [\n        {\n          "name": "event",\n          "type": "string"\n        },\n        {\n          "name": "args",\n          "variadic": true,\n          "type": "unknown"\n        }\n      ],\n      "returns": "void"\n    },\n    {\n      "name": "off",\n      "params": [\n        {\n          "name": "event",\n          "type": "string"\n        },\n        {\n          "name": "handler",\n          "type": "function",\n          "params": [\n            {\n              "name": "args",\n              "variadic": true,\n              "type": "unknown"\n            }\n          ],\n          "returns": "void"\n        }\n      ],\n      "returns": "void"\n    }\n  ]\n}',
    usage: "const bus = new this.utils.EventBus(); bus.on('refresh', () => {}); bus.emit('refresh');",
  },
];
