# GenuiConfigProvider 组件

`GenuiConfigProvider` 用于为 `GenuiRenderer` 注入组件物料配置。

仅使用 ConfigProvider 时可从 `@opentiny/genui-sdk-react/config-provider` 按需引入，见 [安装与配置 - 按需引入](../../guide/react/install#按需引入)。

与 `GenuiRenderer` 一起使用时，通常需要通过 `materials` 注入组件物料，详见 [物料配置](../../guide/react/install#物料配置)。

## Props

### materials

- **类型**: `IMaterials`
- **必填**: 否（使用 `GenuiRenderer` 时需要配置）
- **说明**: 渲染器使用的组件物料。通常传入物料包，例如 `@opentiny/genui-sdk-materials-react-antd` 提供的 `materials` 对象。

```tsx
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-react';
import { materials } from '@opentiny/genui-sdk-materials-react-antd/materials';
import 'antd/dist/reset.css';

export function Example({ content }: { content: string }) {
  return (
    <GenuiConfigProvider materials={materials}>
      <GenuiRenderer content={content} />
    </GenuiConfigProvider>
  );
}
```

查看 [React Ant Design 物料包](../materials/react-antd) 了解物料导出。

#### 区块（blocks）

`materials.blocks` 用于注册区块。区块是可复用的 schema 片段，可以在渲染的 schema 中像普通组件一样按组件名使用。区块的声明结构与物料 bundle 中的组件定义一致，都放在 `schema` 字段下：

- `schema.properties`：声明区块接收的属性（数组写法，按分组组织，`property` 为属性名），区块内的表达式通过 `this.props` 访问
- `schema.events`：声明区块对外暴露的事件，key 即使用方监听的属性名（如 `onExpand`，与 bundle 的组件事件声明一致），作为 IDE / LLM 的契约提示；区块内像 React 原生一样直接调用 `this.props.onExpand(...)`，不经过额外的事件派发机制
- `schema.slots`：声明区块接收的渲染函数属性，key 为属性名，`params` 声明渲染内容可访问的作用域参数
- `children`：区块内部 UI，用内置的 `Slot` 节点声明渲染函数的调用点；`Slot` 是渲染期指令（不经过组件解析），渲染器遇到它时直接调用使用方传入的渲染函数；`Slot` 的 `params` 向渲染内容传作用域参数，`children` 是使用方未传该渲染函数时的兜底内容

协议中的插槽在 React 侧落地为 render props：使用方以 `JSSlot` 属性声明的内容会解析成 `(scope) => ReactNode` 的渲染函数，像普通属性一样传给区块（`schema.slots`、`Slot` 命名沿用跨框架协议）；`children` 为 React 原生 children，直接作为默认内容传入。只有声明过的输入（属性、事件监听、渲染函数）会进入区块内的 `this.props`，与 Vue 区块按 `defineComponent(props)` 声明过滤的机制一致；使用方传入的未声明属性与渲染器注入的内部标记（`data-id`、`data-tag` 等）不会混入。

```tsx
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-react';
import { materials } from '@opentiny/genui-sdk-materials-react-antd/materials';
import 'antd/dist/reset.css';

const userCard = {
  componentName: 'UserCard',
  state: { expanded: false },
  schema: {
    properties: [
      {
        label: { zh_CN: '基础属性' },
        content: [{ property: 'name', type: 'string', description: { zh_CN: '用户名称' } }],
      },
    ],
    events: {
      onExpand: {
        type: 'event',
        description: { zh_CN: '展开状态变化' },
        functionInfo: { params: [{ name: 'expanded', type: 'boolean' }], returns: {} },
      },
    },
    slots: {
      header: { description: { zh_CN: '自定义头部' }, params: [{ name: 'name', type: 'string' }] },
    },
  },
  children: [
    {
      componentName: 'Slot',
      props: {
        name: 'header',
        params: [{ name: 'name', value: { type: 'JSExpression', value: 'this.props.name' } }],
      },
      children: [{ componentName: 'Text', props: { text: '默认头部' } }],
    },
    {
      componentName: 'AntButton',
      props: {
        onClick: {
          type: 'JSFunction',
          value: "function() { this.state.expanded = !this.state.expanded; this.props.onExpand(this.state.expanded) }",
        },
      },
      children: [
        {
          componentName: 'Text',
          props: {
            text: {
              type: 'JSExpression',
              value: '`${this.props.name}：${this.state.expanded ? "已展开" : "已收起"}`',
            },
          },
        },
      ],
    },
  ],
};

export function Example({ content }: { content: string }) {
  return (
    <GenuiConfigProvider materials={{ ...materials, blocks: { UserCard: userCard } }}>
      <GenuiRenderer content={content} />
    </GenuiConfigProvider>
  );
}
```

在 schema 中按组件名使用区块：普通属性直接传值，事件通过声明过的属性名（如 `onExpand`）传 `JSFunction` 监听，渲染函数以 `JSSlot` 属性填充（`params` 声明渲染内容使用的参数名，`value` 为节点列表），默认内容直接写在区块节点的 `children`：

```json
{
  "componentName": "UserCard",
  "props": {
    "name": "张三",
    "onExpand": {
      "type": "JSFunction",
      "value": "function(expanded) { console.log(expanded) }"
    },
    "header": {
      "type": "JSSlot",
      "params": ["name"],
      "value": [
        {
          "componentName": "Text",
          "props": { "text": { "type": "JSExpression", "value": "`你好，${name}`" } }
        }
      ]
    }
  },
  "children": [
    {
      "componentName": "Text",
      "props": { "text": "默认内容" }
    }
  ]
}
```

区块拥有独立的 `state`、`methods` 与 `refs`，与所在页面互不干扰；渲染函数返回的内容属于使用方，其中的 `this.state` 指向使用方页面的状态，区块通过 `Slot` 的 `params` 传出的参数优先于使用方作用域。使用方未传渲染函数时，渲染 `Slot` 的 `children` 作为兜底内容。

## Children

`GenuiConfigProvider` 通过 `children` 包裹子组件。

```tsx
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-react';
import { materials } from '@opentiny/genui-sdk-materials-react-antd/materials';

export function Example({ content }: { content: string }) {
  return (
    <GenuiConfigProvider materials={materials}>
      <GenuiRenderer content={content} />
    </GenuiConfigProvider>
  );
}
```
