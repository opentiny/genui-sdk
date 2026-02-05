# Renderer 组件 - 缓冲字段

通过 `requiredCompleteFieldSelectors` 可以配置缓冲字段，用于指定哪些字段路径需要完整后才应用更新，**主要目的是防止流式返回过程中因字段不完整导致的渲染错误**。

## 为什么需要缓冲字段？

在流式更新场景下，LLM 会片段式地生成 JSON 内容。某些关键字段如果只接收到部分数据就立即参与渲染，会导致组件渲染报错。例如：

- **函数表达式不完整**：`[type=JSFunction]` 的 `value` 字段不完整会导致 JavaScript 解析错误
- **组件名不完整**：`componentName` 字段不完整会导致组件无法识别和渲染
- **图片地址不完整**：`[componentName=img] > props > src` 不完整会导致图片加载失败
- **样式字符串不完整**：`style` 字段不完整可能导致 CSS 解析错误
- **特定组件必需字段**：如 `TinyTabItem` 的 `name`

通过 `requiredCompleteFieldSelectors`，你可以把这类「必须等到完整再渲染」的关键字段声明出来，框架会在流式更新时对这些字段做缓冲处理，等到值完整后再一次性应用，从而提升渲染的稳定性。

## 选择器语法

缓冲配置的使用方法类似 CSS 选择器的语法，支持多种匹配方式：

### 基础语法

- **直接匹配字段名**：`componentName` —— 匹配所有名为 `componentName` 的字段
- **属性选择器**：`[componentName=img]` —— 匹配 `componentName` 为 `img` 的节点
- **子选择器**：`>` —— 匹配直接子字段，例如 `[componentName=img] > props > src`
- **祖先选择器**：空格 —— 匹配任意祖先关系
- **通配符**：`*` —— 匹配任意字段名

### 属性选择器操作符

- `=` —— 完全匹配：`[componentName=img]`
- `^=` —— 前缀匹配：`[componentName^=TinyChart]`匹配以 `TinyChart` 开头的组件名
- `$=` —— 后缀匹配：`[componentName$=Item]`
- `*=` —— 包含匹配：`[componentName*=Chart]`

### 伪类选择器

- `:empty` —— 匹配空值（空字符串、空数组、空对象）
- `:object` —— 匹配对象类型
- `:array` —— 匹配数组类型
- `:string` —— 匹配字符串类型
- `:number` —— 匹配数字类型

### 示例

```typescript
// 匹配组件名为 img 的节点的 src 属性
'[componentName=img] > props > src';

// 匹配所有 type 为 JSFunction 的节点
'[type=JSFunction]';

// 匹配所有 type 为 JSExpression 的节点
'[type=JSExpression]';

// 匹配所有以 TinyChart 开头的组件的 props 下的所有字段
'[componentName^=TinyChart] > props > *';

// 匹配 TinyTabItem 组件的 name 属性
'[componentName=TinyTabItem] > props > name';

// 匹配空对象
':empty:object';
```

## 默认配置

组件内置了以下默认字段列表，覆盖了常见的易错场景：

```typescript
export const requiredCompleteFieldSelectors = [
  '[componentName=img] > props > src', // 图片地址必须完整
  'componentName', // 组件名必须完整
  'style', // 样式字符串必须完整
  '[type=JSFunction]', // 函数代码必须完整
  '[type=JSExpression]', // 表达式代码必须完整
  '[type=JSSlot][value=]', // 插槽值必须完整
  'type', // 类型字段必须完整
  ':empty:object', // 空对象必须完整
];
```

## 自定义配置

你可以通过 `requiredCompleteFieldSelectors` prop 传入自定义的选择器列表，这些自定义规则会与默认列表合并使用：

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
          { label: '选项1', value: '1' },
          { label: '选项2', value: '2' },
        ],
      },
    },
  ],
});

// 自定义选择器：指定 TinySelect 的 options 数组必须完整
const customSelectors = ['[componentName=TinySelect] > props > options'];
</script>
```

## 注意事项

1. **选择器准确性**：确保选择器语法正确，错误的路径不会生效
2. **性能影响**：指定过多的字段路径可能会略微影响更新性能，建议只指定关键的易错字段
