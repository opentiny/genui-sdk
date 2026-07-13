# Renderer - Buffered Fields

Use `requiredCompleteFieldSelectors` to declare which field paths must be complete before updates apply. **This mainly prevents render errors when streaming partial JSON.**

## Why Buffered Fields?

During streaming, the LLM emits JSON in fragments. Rendering some fields too early can break the UI, for example:

- **Incomplete JSFunction**: partial `value` under `[type=JSFunction]` causes parse errors
- **Incomplete componentName**: unknown or partial names fail to render
- **Incomplete image src**: `[componentName=img] > props > src` may load invalid URLs
- **Incomplete style**: partial CSS strings may fail to parse
- **Required component fields**: e.g. `name` on `TinyTabItem`

Buffered selectors tell the framework to hold those values until complete, then apply them in one shot.

## Selector Syntax

Selectors resemble CSS:

### Basics

- **Field name**: `componentName` — any field named `componentName`
- **Attribute selector**: `[componentName=img]` — nodes where `componentName` is `img`
- **Child combinator**: `>` — direct child, e.g. `[componentName=img] > props > src`
- **Descendant**: space — any ancestor relationship
- **Wildcard**: `*` — any field name

### Attribute Operators

- `=` — exact: `[componentName=img]`
- `^=` — prefix: `[componentName^=TinyChart]`
- `$=` — suffix: `[componentName$=Item]`
- `*=` — contains: `[componentName*=Chart]`

### Pseudo-classes

- `:empty` — empty string, array, or object
- `:object` — object type
- `:array` — array type
- `:string` — string type
- `:number` — number type

### Examples

```typescript
// src on img nodes
'[componentName=img] > props > src';

// All JSFunction nodes
'[type=JSFunction]';

// All JSExpression nodes
'[type=JSExpression]';

// All props under components whose name starts with TinyChart
'[componentName^=TinyChart] > props > *';

// name prop on TinyTabItem
'[componentName=TinyTabItem] > props > name';

// Empty objects
':empty:object';
```

## Defaults

Built-in selectors cover common failure cases:

```typescript
export const requiredCompleteFieldSelectors = [
  '[componentName=img] > props > src',
  'componentName',
  'style',
  '[type=JSFunction]',
  '[type=JSExpression]',
  '[type=JSSlot][value=]',
  'type',
  ':empty:object',
];
```

## Custom Configuration

Pass `requiredCompleteFieldSelectors`; custom rules are merged with defaults:

```vue
<template>
  <GenuiRenderer :content="content" :generating="generating" :requiredCompleteFieldSelectors="customSelectors" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { GenuiRenderer } from '@opentiny/genui-sdk-vue';

const generating = ref(false);
const content = ref({
  componentName: 'Page',
  children: [
    {
      componentName: 'TinySelect',
      props: {
        options: [
          { label: 'Option 1', value: '1' },
          { label: 'Option 2', value: '2' },
        ],
      },
    },
  ],
});

const customSelectors = ['[componentName=TinySelect] > props > options'];
</script>
```

## Notes

1. **Accurate selectors**: Invalid paths are ignored.
2. **Performance**: Too many selectors can slow updates; prefer critical fragile fields.
