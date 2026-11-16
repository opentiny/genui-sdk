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

`materials.blocks` 用于注册区块。区块是带有输入输出声明的可复用 schema 片段，可以在渲染的 schema 中像普通组件一样按组件名使用。

- `inputs`：声明区块接收的属性，区块内的表达式通过 `this.props` 访问
- `outputs`：声明区块派发的事件，使用方通过 `onXxx` 属性监听，区块内通过 `this.dispatchEvent(name, ...args)` 派发
- `children`：区块内部 UI，可使用内置组件 `Slot` 声明插槽，使用方通过 `Template` 子节点填充

```tsx
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-react';
import { materials } from '@opentiny/genui-sdk-materials-react-antd/materials';
import 'antd/dist/reset.css';

const userCard = {
  componentName: 'UserCard',
  state: { expanded: false },
  inputs: {
    name: { type: 'string', description: '用户名称' },
  },
  outputs: {
    expand: { type: 'boolean', description: '展开状态变化' },
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
          value: "function() { this.dispatchEvent('expand', !this.state.expanded) }",
        },
      },
      children: {
        type: 'JSExpression',
        value: '`${this.props.name}：${this.state.expanded ? "已展开" : "已收起"}`',
      },
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

在 schema 中按组件名使用区块，通过 `Template` 填充具名插槽，插槽内容可以访问 `Slot` 声明的 `params`：

```json
{
  "componentName": "UserCard",
  "props": {
    "name": "张三",
    "onExpand": {
      "type": "JSFunction",
      "value": "function(expanded) { console.log(expanded) }"
    }
  },
  "children": [
    {
      "componentName": "Template",
      "props": { "slot": "header", "params": ["name"] },
      "children": [
        {
          "componentName": "Text",
          "props": { "text": { "type": "JSExpression", "value": "`你好，${name}`" } }
        }
      ]
    }
  ]
}
```

区块拥有独立的 `state`、`methods` 与 `refs`，与所在页面互不干扰；插槽内容属于使用方，其中的 `this.state` 指向使用方页面的状态。使用方未提供插槽时，渲染 `Slot` 的 `children` 作为兜底内容。

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
