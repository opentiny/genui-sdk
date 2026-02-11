<!-- markdownlint-disable MD041 -->
<!-- markdownlint-disable MD033 -->
<div style="text-align: center;">
  <h1>Schema 协议规范</h1>
</div>

Schema 协议是一个基于 JSON 的声明式 UI 描述协议，用于定义和渲染用户界面。该协议采用树形结构描述组件层次关系，支持动态数据绑定和事件处理。

## 概述

Schema 协议通过 JSON 对象描述完整的 UI 结构，包括：

- **组件树结构**：通过嵌套的节点对象描述组件的层次关系
- **组件属性**：每个组件可以配置属性，支持原始值、JS 表达式、JS 函数等
- **状态管理**：通过 `state` 字段管理页面级别的状态数据
- **事件处理**：通过 `methods` 字段定义可复用的方法，组件属性可以绑定这些方法

### 设计原则

1. **声明式**：使用声明式结构描述 UI，而非命令式操作
2. **平台无关**：协议本身不绑定特定框架，通过组件注册表映射到具体实现
3. **类型安全**：通过类型定义确保 Schema 结构的正确性
4. **可扩展**：支持自定义组件和属性类型

## 核心概念

### Schema 对象

Schema 是一个 JSON 对象，包含完整的页面定义。它必须包含 `componentName` 字段，通常为 `"Page"`。

### 节点（Node）

节点是组件树中的基本单元，每个节点代表一个 UI 组件。节点包含：
- `componentName`：组件名称（必需）
- `id`：节点唯一标识（可选，但建议提供）
- `props`：组件属性
- `children`：子节点数组
- 其他可选字段：`slot`、`loop`、`condition` 等

### 根节点（RootNode）

根节点是 Schema 的顶层节点，除了包含普通节点的所有字段外，还包含页面级别的配置：
- `state`：全局状态
- `methods`：方法集合
- `css`：全局样式

## 数据结构

### RootNode 类型定义

```typescript
type RootNode = Omit<Node, 'id'> & {
  id?: string;                    // 根节点可选 id
  css?: string;                   // 全局 CSS 样式字符串
  fileName?: string;              // 文件名
  methods?: Methods;              // 方法集合
  state?: Record<string, unknown>; // 全局状态
  schema?: any;                   // 内嵌或外部 Schema
};
```

### Node 类型定义

```typescript
interface Node {
  id?: string;                    // 节点唯一标识（可选）
  componentName: string;          // 组件名（必需）
  props?: Record<string, any> & { 
    columns?: { slots?: Record<string, any> }[] 
  };                             // 组件属性集合
  children?: Node[];              // 子节点数组
  componentType?: 'Block' | 'PageStart' | 'PageSection'; // 节点类型
  slot?: string | Record<string, any>; // 插槽内容
  params?: string[];              // 参数名列表
  loop?: Record<string, any>;     // 循环渲染配置
  loopArgs?: string[];            // 循环参数名列表
  condition?: boolean | Record<string, any>; // 条件渲染配置
}
```

### 字段说明

#### 必需字段

- **componentName** (string): 组件名称，必须与客户端组件注册表中的组件名匹配

#### 可选字段

- **id** (string): 节点唯一标识，建议为每个节点提供，便于调试和事件处理
- **props** (object): 组件属性对象，键为属性名，值为属性值（支持多种类型）
- **children** (Node[]): 子节点数组，定义组件的子组件
- **componentType** ('Block' | 'PageStart' | 'PageSection'): 节点类型，通常省略
- **slot** (string | object): 插槽内容，可以是字符串或对象
- **params** (string[]): 参数名列表
- **loop** (object): 循环渲染配置，用于列表渲染
- **loopArgs** (string[]): 循环参数名列表，如 `["item", "index"]`
- **condition** (boolean | object): 条件渲染配置，控制组件是否渲染

#### RootNode 特有字段

- **css** (string): 全局 CSS 样式字符串
- **fileName** (string): 文件名标识
- **methods** (Methods): 方法集合，定义可复用的函数
- **state** (Record<string, unknown>): 全局状态对象
- **schema** (any): 内嵌或外部 Schema

## 属性值类型

属性值（PropValue）支持以下类型：

### 1. 原始值

- `string`: 字符串
- `number`: 数字
- `boolean`: 布尔值
- `null`: null 值

### 2. JS 表达式（JSExpression）

用于动态计算属性值，支持访问状态、执行计算等。

```typescript
interface JSExpression {
  type: 'JSExpression';          // 固定为 'JSExpression'
  value: string;                 // 表达式字符串
  model?: boolean;               // 是否为双向绑定模型值
  params?: string[];                // 作用域插槽传递的参数
}
```

**示例：**
```json
{
  "text": {
    "type": "JSExpression",
    "value": "this.state.userName + ' - ' + this.state.userHandle"
  }
}
```

**双向绑定示例：**
```json
{
  "value": {
    "type": "JSExpression",
    "value": "this.state.inputValue",
    "model": true
  }
}
```

### 3. JS 函数（JSFunction）

用于定义事件处理函数。

```typescript
interface JSFunction {
  type: 'JSFunction';            // 固定为 'JSFunction'
  value: string;                 // 函数体字符串（可序列化）
}
```

**示例：**
```json
{
  "onClick": {
    "type": "JSFunction",
    "value": "function() { alert('按钮被点击'); }"
  }
}
```

### 4. 插槽（JSSlot）

用于定义插槽内容。

```typescript
interface JSSlot {
  type: 'JSSlot';                // 固定为 'JSSlot'
  value: string | Record<string, any>; // 插槽内容
}
```

### 5. 数组和对象

属性值可以是数组或对象，支持嵌套结构。

```json
{
  "items": ["item1", "item2", "item3"],
  "config": {
    "key1": "value1",
    "key2": {
      "type": "JSExpression",
      "value": "this.state.dynamicValue"
    }
  }
}
```

### 6. 特殊结构：columns

对于表格等组件，`props` 支持特殊的 `columns` 结构：

```json
{
  "props": {
    "columns": [
      {
        "prop": "name",
        "label": "姓名",
        "slots": {
          "default": "custom-name-slot"
        }
      }
    ]
  }
}
```

## 组件渲染

### 基本渲染

组件通过 `componentName` 字段指定要渲染的组件，客户端根据组件注册表查找对应的实现。

```json
{
  "componentName": "Text",
  "id": "text-1",
  "props": {
    "text": "Hello World"
  }
}
```

### 嵌套渲染

通过 `children` 字段定义子组件，形成组件树。

```json
{
  "componentName": "CanvasFlexBox",
  "id": "container",
  "props": {
    "flexDirection": "column"
  },
  "children": [
    {
      "componentName": "Text",
      "id": "title",
      "props": {
        "text": "标题"
      }
    },
    {
      "componentName": "Text",
      "id": "content",
      "props": {
        "text": "内容"
      }
    }
  ]
}
```

### 条件渲染

通过 `condition` 字段控制组件是否渲染。

```json
{
  "componentName": "Text",
  "id": "conditional-text",
  "condition": {
    "type": "JSExpression",
    "value": "this.state.isVisible"
  },
  "props": {
    "text": "条件渲染的文本"
  }
}
```

或者使用布尔值：

```json
{
  "componentName": "Text",
  "id": "conditional-text",
  "condition": true,
  "props": {
    "text": "条件渲染的文本"
  }
}
```

### 循环渲染

通过 `loop` 和 `loopArgs` 字段实现列表渲染。

```json
{
  "componentName": "div",
  "id": "list-item",
  "loop": {
    "list": {
      "type": "JSExpression",
      "value": "this.state.items"
    }
  },
  "loopArgs": ["item", "index"],
  "props": {
    "style": "padding: 10px;"
  },
  "children": [
    {
      "componentName": "Text",
      "id": "item-text",
      "props": {
        "text": {
          "type": "JSExpression",
          "value": "item.name"
        }
      }
    }
  ]
}
```

### 插槽渲染

通过 `slot` 字段定义插槽内容。

```json
{
  "componentName": "Card",
  "id": "card-1",
  "slot": "插槽内容文本"
}
```

或者使用对象形式定义多个插槽：

```json
{
  "componentName": "Card",
  "id": "card-1",
  "slot": {
    "header": "头部内容",
    "footer": "底部内容"
  }
}
```

## 状态管理

### 定义状态

在根节点的 `state` 字段中定义全局状态。

```json
{
  "componentName": "Page",
  "state": {
    "userName": "张三",
    "userAge": 25,
    "isLoggedIn": true,
    "userProfile": {
      "name": "张三",
      "email": "zhangsan@example.com"
    }
  }
}
```

### 使用状态

在组件属性中通过 JS 表达式访问状态，使用 `this.state` 来访问状态值。

```json
{
  "componentName": "Text",
  "id": "user-name",
  "props": {
    "text": {
      "type": "JSExpression",
      "value": "this.state.userName"
    }
  }
}
```

### 双向绑定

对于表单组件，使用 `model: true` 实现双向绑定。

```json
{
  "componentName": "Input",
  "id": "user-input",
  "props": {
    "value": {
      "type": "JSExpression",
      "value": "this.state.inputValue",
      "model": true
    }
  }
}
```

## 事件处理

### 定义方法

在根节点的 `methods` 字段中定义可复用的方法。

```json
{
  "componentName": "Page",
  "state": {
    "formData": {
      "name": "",
      "email": ""
    }
  },
  "methods": {
    "handleSubmit": {
      "type": "JSFunction",
      "value": "function($event) { console.log('触发的事件对象', $event); console.log('提交数据:', this.state.formData); }"
    }
  }
}
```

### 绑定事件

在组件属性中绑定事件处理函数。

**方式一：引用 methods 中的方法**
```json
{
  "componentName": "TinyButton",
  "id": "submit-btn",
  "props": {
    "text": "提交",
    "onClick": {
      "type": "JSExpression",
      "value": "this.handleSubmit"
    }
  }
}
```

**方式二：直接定义 JSFunction**
```json
{
  "componentName": "TinyButton",
  "id": "submit-btn",
  "props": {
    "text": "提交",
    "onClick": {
      "type": "JSFunction",
      "value": "function() { console.log('提交按钮被点击'); }"
    }
  }
}
```

## 完整示例

### 示例 1：简单页面

```json
{
  "componentName": "Page",
  "fileName": "SimplePage",
  "css": ".page-base-style {\n  padding: 24px;\n  background: #FFFFFF;\n}",
  "props": {
    "className": "page-base-style"
  },
  "children": [
    {
      "componentName": "CanvasFlexBox",
      "id": "container",
      "props": {
        "flexDirection": "column",
        "justifyContent": "center",
        "alignItems": "center"
      },
      "children": [
        {
          "componentName": "Text",
          "id": "title",
          "props": {
            "text": "欢迎使用 Schema 协议",
            "style": "font-size: 24px; font-weight: bold; margin-bottom: 20px;"
          }
        },
        {
          "componentName": "Text",
          "id": "subtitle",
          "props": {
            "text": "这是一个基于声明式 Schema 的 UI 渲染协议",
            "style": "font-size: 16px; color: #666;"
          }
        }
      ]
    }
  ],
  "state": {},
  "methods": {},
  "id": "body"
}
```

### 示例 2：带状态和事件的页面

```json
{
  "componentName": "Page",
  "fileName": "UserProfile",
  "css": ".page-base-style {\n  padding: 24px;\n}",
  "props": {
    "className": "page-base-style"
  },
  "state": {
    "userName": "张三",
    "userAvatar": "https://www.example.com/avatar.jpg",
    "userBio": "全栈开发工程师"
  },
  "methods": {
    "handleClick": {
      "type": "JSFunction",
      "value": "function() { alert('按钮被点击了！'); }"
    }
  },
  "children": [
    {
      "componentName": "CanvasFlexBox",
      "id": "profile-container",
      "props": {
        "flexDirection": "column",
        "alignItems": "center",
        "gap": "20px"
      },
      "children": [
        {
          "componentName": "img",
          "id": "avatar",
          "props": {
            "src": {
              "type": "JSExpression",
              "value": "this.state.userAvatar"
            },
            "style": "width: 100px; height: 100px; border-radius: 50%;"
          }
        },
        {
          "componentName": "Text",
          "id": "name",
          "props": {
            "text": {
              "type": "JSExpression",
              "value": "this.state.userName"
            },
            "style": "font-size: 24px; font-weight: bold;"
          }
        },
        {
          "componentName": "Text",
          "id": "bio",
          "props": {
            "text": {
              "type": "JSExpression",
              "value": "this.state.userBio"
            },
            "style": "font-size: 16px; color: #666;"
          }
        },
        {
          "componentName": "TinyButton",
          "id": "action-btn",
          "props": {
            "text": "点击我",
            "onClick": {
              "type": "JSExpression",
              "value": "this.handleClick"
            }
          }
        }
      ]
    }
  ],
  "id": "body"
}
```

### 示例 3：带循环渲染的列表

```json
{
  "componentName": "Page",
  "fileName": "ProductList",
  "state": {
    "products": [
      { "id": 1, "name": "产品A", "price": 100 },
      { "id": 2, "name": "产品B", "price": 200 },
      { "id": 3, "name": "产品C", "price": 300 }
    ]
  },
  "children": [
    {
      "componentName": "CanvasFlexBox",
      "id": "product-list",
      "props": {
        "flexDirection": "column",
        "gap": "10px"
      },
      "children": [
        {
          "componentName": "div",
          "id": "product-item",
          "loop": {
            "list": {
              "type": "JSExpression",
              "value": "this.state.products"
            }
          },
          "loopArgs": ["item", "index"],
          "props": {
            "style": "padding: 10px; border: 1px solid #ddd; border-radius: 4px;"
          },
          "children": [
            {
              "componentName": "Text",
              "id": "product-name",
              "props": {
                "text": {
                  "type": "JSExpression",
                  "value": "item.name"
                },
                "style": "font-size: 18px; font-weight: bold;"
              }
            },
            {
              "componentName": "Text",
              "id": "product-price",
              "props": {
                "text": {
                  "type": "JSExpression",
                  "value": "'价格: ¥' + item.price"
                },
                "style": "font-size: 16px; color: #666;"
              }
            }
          ]
        }
      ]
    }
  ],
  "methods": {},
  "id": "body"
}
```

## 类型定义

### 完整 TypeScript 类型定义

```typescript
// JS 表达式
export type JSExpression = { 
  type: 'JSExpression'; 
  value: string; 
  model?: boolean;
  params?: string[];
};

// JS 函数
export type JSFunction = { 
  type: 'JSFunction'; 
  value: string; 
};

// 插槽
export type JSSlot = { 
  type: 'JSSlot'; 
  value: string | Record<string, any> 
};

// 方法集合
export type Methods = Record<string, JSFunction>;

// 属性值类型（递归）
export type PropValue =
  | string
  | number
  | boolean
  | null
  | JSExpression
  | JSFunction
  | JSSlot
  | PropValue[]
  | Record<string, PropValue>;

// 节点接口
export interface Node {
  id?: string;                    // 节点唯一标识（可选）
  componentName: string;           // 组件名（必需）
  props?: Record<string, any> & { 
    columns?: { slots?: Record<string, any> }[] 
  };                              // 组件属性集合
  children?: Node[];              // 子节点数组
  componentType?: 'Block' | 'PageStart' | 'PageSection'; // 节点类型
  slot?: string | Record<string, any>; // 插槽内容
  params?: string[];               // 参数名列表
  loop?: Record<string, any>;      // 循环渲染配置
  loopArgs?: string[];             // 循环参数名列表
  condition?: boolean | Record<string, any>; // 条件渲染配置
}

// 根节点类型
export type RootNode = Omit<Node, 'id'> & {
  id?: string;                    // 根节点可选 id
  css?: string;                   // 全局 CSS 样式字符串
  fileName?: string;              // 文件名
  methods?: Methods;               // 方法集合
  state?: Record<string, unknown>; // 全局状态
  schema?: any;                    // 内嵌或外部 Schema
};
```

## 常用组件

### 布局组件

- **CanvasFlexBox**: 弹性布局容器
  - `flexDirection`: 主轴方向（'row' | 'column'）
  - `justifyContent`: 主轴对齐方式
  - `alignItems`: 交叉轴对齐方式
  - `wrap`: 是否换行
  - `gap`: 间距

- **div**: 通用容器
  - `style`: 内联样式字符串
  - `className`: CSS 类名

### 基础组件

- **Text**: 文本组件
  - `text`: 文本内容
  - `style`: 样式字符串

- **img**: 图片组件
  - `src`: 图片地址
  - `alt`: 替代文本
  - `style`: 样式字符串

### 业务组件

- **TinyTabs**: 标签页组件
  - `modelValue`: 当前激活的标签
  - `className`: CSS 类名

- **TinyTabItem**: 标签页项
  - `title`: 标签标题
  - `name`: 标签名称

- **TinyCarousel**: 轮播图组件
  - `height`: 高度
  - `autoplay`: 是否自动播放
  - `interval`: 切换间隔（毫秒）

- **TinyCarouselItem**: 轮播图项
  - `title`: 项标题

- **TinyButton**: 按钮组件
  - `text`: 按钮文本
  - `onClick`: 点击事件处理函数

## 常见问题

### Q: 如何实现组件间的数据传递？

A: 通过 `state` 字段定义全局状态，子组件通过 JS 表达式使用 `this.state` 访问状态。

### Q: 如何实现条件渲染？

A: 使用节点的 `condition` 字段，可以是布尔值或 JS 表达式。

### Q: 如何实现列表渲染？

A: 使用节点的 `loop` 和 `loopArgs` 字段，`loop` 指定数据源，`loopArgs` 指定循环变量名。

### Q: 如何实现双向绑定？

A: 在 JSExpression 中设置 `model: true`，适用于表单组件。

### Q: 如何定义组件的事件处理？

A: 有两种方式：
1. 在根节点的 `methods` 中定义方法，然后在组件属性中使用 `this.方法名` 引用（如 `this.handleClick`）
2. 直接在组件属性中定义 JSFunction

## 参考

- [TinyEngine 协议规范](https://opentiny.design/tiny-engine#/protocol)
