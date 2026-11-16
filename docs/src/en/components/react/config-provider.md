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

`materials.blocks` registers blocks. A block is a reusable schema fragment with declared inputs and outputs, and can be used by name in a rendered schema just like a regular component.

- `inputs`: declares the props a block accepts; expressions inside the block read them via `this.props`
- `outputs`: declares the events a block emits; consumers listen via `onXxx`, and the block emits via `this.dispatchEvent(name, ...args)`
- `children`: the block's internal UI; use the built-in `Slot` component to declare slots, which consumers fill with `Template` children

```tsx
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-react';
import { materials } from '@opentiny/genui-sdk-materials-react-antd/materials';
import 'antd/dist/reset.css';

const userCard = {
  componentName: 'UserCard',
  state: { expanded: false },
  inputs: {
    name: { type: 'string', description: 'User name' },
  },
  outputs: {
    expand: { type: 'boolean', description: 'Expand state changed' },
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
          value: "function() { this.state.expanded = !this.state.expanded; this.dispatchEvent('expand', this.state.expanded) }",
        },
      },
      children: {
        type: 'JSExpression',
        value: '`${this.props.name}: ${this.state.expanded ? "expanded" : "collapsed"}`',
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

Use the block by name in a schema, and fill named slots with `Template`. Slot content can access the `params` declared by `Slot`:

```json
{
  "componentName": "UserCard",
  "props": {
    "name": "Zhang San",
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
          "props": { "text": { "type": "JSExpression", "value": "`Hello, ${name}`" } }
        }
      ]
    }
  ]
}
```

A block has its own `state`, `methods`, and `refs`, isolated from the page that renders it. Slot content belongs to the consumer, so its `this.state` refers to the consumer page's state. When the consumer provides no slot, the `Slot`'s `children` are rendered as the fallback.

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
