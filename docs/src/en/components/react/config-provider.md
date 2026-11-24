# GenuiConfigProvider Component

`GenuiConfigProvider` injects component materials for `GenuiRenderer`.

When using only ConfigProvider, you can import it on demand from `@opentiny/genui-sdk-react/config-provider`. See [Install - Subpath Imports](../../guide/react/install#subpath-imports).

When used with `GenuiRenderer`, you typically need to inject component materials via the `materials` prop. See [Materials Configuration](../../guide/react/install#materials-configuration).

## Props

### materials

- **Type**: `IMaterials`
- **Required**: No (required when using `GenuiRenderer`)
- **Description**: Component materials for the renderer. Typically the `materials` object from `@opentiny/genui-sdk-materials-react-antd`.

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

See [React Ant Design materials](../materials/react-antd) for materials exports.

#### Blocks

`materials.blocks` registers blocks. A block is a reusable schema fragment that can be used by name in a rendered schema just like a regular component. A block's declarations follow the same structure as component definitions in the materials bundle, placed under the `schema` field:

- `schema.properties`: declares the props a block accepts (grouped arrays, `property` is the prop name); expressions inside the block read them via `this.props`
- `schema.events`: declares the events a block exposes; the key is the prop name the consumer listens on (such as `onExpand`, aligned with bundle component event declarations), serving as a contract hint for IDEs / LLMs. Inside the block, call it directly like native React (`this.props.onExpand(...)`) — there is no extra event dispatch mechanism
- `schema.slots`: declares the render-function props a block accepts; the key is the prop name and `params` declares the scope parameters available to the rendered content
- `children`: the block's internal UI; use the built-in `Slot` node to declare where a render function is invoked. `Slot` is a render-time directive (it bypasses component resolution): when the renderer meets it, it directly calls the render function passed by the consumer. `Slot`'s `params` passes scope parameters to the rendered content, and its `children` are the fallback rendered when the consumer passes no render function

The protocol's slots land in React as render props: content the consumer declares with a `JSSlot` prop is parsed into a `(scope) => ReactNode` render function and passed to the block like a normal prop (the `schema.slots` and `Slot` naming follows the cross-framework protocol); `children` is React's native children, passed directly as the default content. Only declared inputs (props, event listeners, render functions) enter the block's `this.props`, matching the Vue block's `defineComponent(props)` declaration filtering; undeclared props passed by consumers and renderer-injected internal markers (`data-id`, `data-tag`, etc.) never mix in.

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
      children: [{ componentName: 'Text', props: { text: 'Default header' } }],
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
              value: '`${this.props.name}: ${this.state.expanded ? "expanded" : "collapsed"}`',
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

Use the block by name in a schema: pass plain values to props, listen to events with a `JSFunction` on the declared prop name (such as `onExpand`), pass render functions as `JSSlot` props (`params` declares the parameter names used by the rendered content, `value` holds the node list), and put default content directly in the block node's `children`:

```json
{
  "componentName": "UserCard",
  "props": {
    "name": "Zhang San",
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
          "props": { "text": { "type": "JSExpression", "value": "`Hello, ${name}`" } }
        }
      ]
    }
  },
  "children": [
    {
      "componentName": "Text",
      "props": { "text": "Default content" }
    }
  ]
}
```

A block has its own `state`, `methods`, and `refs`, isolated from the page that renders it. Content returned by render functions belongs to the consumer, so its `this.state` refers to the consumer page's state; parameters passed by the block via `Slot`'s `params` take precedence over the consumer scope. When the consumer passes no render function, the `Slot`'s `children` are rendered as the fallback.

## Children

`GenuiConfigProvider` wraps child components via `children`.

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
