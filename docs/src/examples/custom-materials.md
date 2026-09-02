# 自定义物料库

自 `1.3.0` 起，GenUI SDK 完成了物料解耦：框架包（`@opentiny/genui-sdk-vue` 等）不再内置任何组件物料，而是通过独立的**物料包**（Materials Package）提供运行时组件映射与 Prompt 元数据，再通过 `GenuiConfigProvider` 注入。

如果你想将自己的组件库（官方未支持或私有组件库）接入 GenUI，只需要编写一个**物料包**。本文以 [Naive UI](https://www.naiveui.com/) 为例，讲解如何从零打造一个属于自己的物料库。

## 实战：从零打造一个 Naive UI 物料库

### 目标：一个极简的物料库

为了让示例尽量精简，我们只挑选 Naive UI 中几个常用的**表单组件**，外加一个自封装的图标组件：

- 表单组件：`NInput` 输入框、`NSelect` 选择器、`NButton` 按钮
- 表单容器：`NForm` 表单、`NFormItem` 表单项
- 卡片容器：`NCard`（同时也是默认的包裹组件）
- 图标：自封装的 `NIconSvg`（见[第四步：添加图标物料](#step-4-icon-materials)），搭配 `SearchOutline`、`CheckmarkOutline`（来自 `@vicons/ionicons5`）

最终，一个能发布的最小物料库核心只有 **5 个源文件**（外加几个一行代码的入口文件）：

```text
src/
├── index.ts                    # 包入口：统一导出（可选，见「物料包核心概述」）
├── materials/
│   ├── index.ts                # materials 子路径入口（一行 re-export）
│   ├── materials.ts            # 组装 IMaterials（组件清单 + 默认值映射）
│   └── components/
│       └── components.ts       # componentName → 组件 清单
└── meta/
    ├── index.ts                # meta 子路径入口（一行 re-export）
    ├── meta.ts                 # 组装 IMaterialsMeta（协议 + 白名单）
    ├── white-list.ts           # 允许 LLM 使用的 componentName 白名单
    └── bundle.json             # 组件协议描述（LLM 说明书）
```

### 第一步：初始化项目

创建包目录并初始化：

```bash
mkdir genui-materials-naive-ui && cd genui-materials-naive-ui
npm init -y
```

安装依赖：

```bash
npm install @opentiny/genui-sdk-core
npm install vue naive-ui @vicons/ionicons5
npm install -D typescript vite vite-plugin-dts @vitejs/plugin-vue
```

- `@opentiny/genui-sdk-core`：提供类型（`IMaterials`、`IMaterialsMeta`）与工具（`buildMaterialDefaultValueMap`），作为运行时依赖。
- `vue`、`naive-ui`、`@vicons/ionicons5`：组件库本身。
- 构建相关（`vite`、`vite-plugin-dts`、`@vitejs/plugin-vue`）：作为开发依赖。

另外，`meta.ts` 会用 `with { type: 'json' }` 导入 `bundle.json`（见[第三步](#step-3-meta)），默认的 TypeScript 配置并不支持 JSON 模块解析，需要补一份 `tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

- `resolveJsonModule`：允许以 `with { type: 'json' }` 导入 `bundle.json`。
- `module: "ESNext"` + `moduleResolution: "bundler"`：与 Vite/ESM 的模块解析方式一致，`vite-plugin-dts` 生成声明文件时也依赖它。
- `include: ["src/**/*"]`：让类型检查与声明生成覆盖整个 `src`。

### 第二步：编写组件清单（materials）

组件清单是一份 `componentName → 组件` 的映射。渲染器拿到 Schema 里的 `componentName` 后，正是通过这张清单找到对应的真实组件：

```ts
// src/materials/components/components.ts
import type { Component } from 'vue';
import { NButton, NCard, NForm, NFormItem, NInput, NSelect } from 'naive-ui';

export interface IComponents {
  [key: string]: Component;
}

export const components: IComponents = {
  NButton,
  NCard,
  NForm,
  NFormItem,
  NInput,
  NSelect,
};
```

**一行组件，就是一个物料。** 清单里的 key（如 `NInput`）就是 Schema 中的 `componentName`，必须与 `meta` 中声明的组件名保持一致。

再把这套清单组装成渲染器需要的 `IMaterials`：

```ts
// src/materials/materials.ts
import { buildMaterialDefaultValueMap, type IMaterials } from '@opentiny/genui-sdk-core';
import { materialsMeta } from '../meta';
import { components } from './components';

const requiredCompleteFieldSelectors = [];

export { components };

export const materials: IMaterials = {
  components,
  requiredCompleteFieldSelectors,
  defaultPropsMap: buildMaterialDefaultValueMap(materialsMeta),
};
```

- `components`：组件清单，渲染器通过它解析 `componentName → 组件`。
- `defaultPropsMap`：由 `buildMaterialDefaultValueMap` 根据 `bundle.json` 里的 `defaultValue` 自动生成，流式渲染时字段不全也能自动补全。
- `requiredCompleteFieldSelectors`：**缓冲字段**。声明后，这些字段要等完整才参与渲染，避免流式过程中因字段不完整而报错（如 `[componentName=NSelect] > props > options`）。语法详见 [配置缓冲字段](./renderer/required-complete-field-selectors)。

最后补上 `materials` 子路径入口：

```ts
// src/materials/index.ts
export * from './materials';
```

### 第三步：编写组件说明书（meta） {#step-3-meta}

`meta` 是最关键的部分 —— 它决定了大模型能生成什么。核心是 `bundle.json`，一份描述每个组件"叫什么、有什么用、有哪些属性"的说明书，`genPrompt` 会把这里的信息讲给 LLM 听。

以 `NInput` 为例，`src/meta/bundle.json` 的协议描述长这样：

```json
{
  "data": {
    "framework": "Vue",
    "materials": {
      "components": [
        {
          "name": { "zh_CN": "输入框" },
          "component": "NInput",
          "description": "通过鼠标或键盘输入字符",
          "npm": {
            "package": "naive-ui",
            "exportName": "NInput",
            "destructuring": true
          },
          "schema": {
            "properties": [
              {
                "name": "0",
                "label": { "zh_CN": "基础属性" },
                "content": [
                  {
                    "property": "modelValue",
                    "label": { "text": { "zh_CN": "绑定值" } },
                    "description": { "zh_CN": "绑定值" },
                    "required": true,
                    "type": "string",
                    "cols": 12
                  },
                  {
                    "property": "placeholder",
                    "label": { "text": { "zh_CN": "占位文本" } },
                    "description": { "zh_CN": "输入框占位文本" },
                    "required": false,
                    "type": "string",
                    "cols": 12
                  }
                ]
              }
            ],
            "events": {
              "onUpdate:modelValue": {
                "label": { "zh_CN": "绑定值改变时触发" },
                "description": { "zh_CN": "绑定值改变时触发" }
              }
            }
          }
        }
      ]
    }
  }
}
```

`bundle.json` 直接决定大模型生成的 Schema 结构，务必写清楚、写准确。各字段含义如下：

| 字段 | 含义 |
|------|------|
| `component` | 组件名，对应渲染时的 `componentName`，**必须与组件清单的 key 一致** |
| `name` | 组件显示名，用于配置面板与分组展示 |
| `description` | 组件说明，是 LLM 生成时的主要依据，**写得越细越准** |
| `npm` | 组件来源包信息（包名、导出名），用于代码生成与按需引入 |
| `schema.properties` | 属性分组描述，决定配置面板展示哪些属性；其中 `property` 是属性名、`type` 是属性类型、`defaultValue` 会用于生成默认值映射 |
| `schema.events` | 组件事件，供 LLM 生成事件绑定 |
| `schema.slots` | 组件插槽，供 LLM 在合适的位置放置子组件 |

把 `bundle.json` 与白名单组装成 `materialsMeta`：

```ts
// src/meta/white-list.ts
export const whiteList = [
  'NInput', 'NSelect', 'NButton', 'NForm', 'NFormItem', 'NCard',
  'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ol', 'ul', 'li', 'label', 'div', 'span',
  'Text',
];

// src/meta/meta.ts
import type { IMaterialsMeta, IMaterialsProtocol } from '@opentiny/genui-sdk-core';
import bundleJson from './bundle.json' with { type: 'json' };
import { whiteList } from './white-list';

export const materialsMeta: IMaterialsMeta = {
  materials: [bundleJson] as unknown as IMaterialsProtocol[],
  wrapperComponent: 'NCard',
  whiteList,
  examples: [],
  rules: [],
};
```

`IMaterialsMeta` 各字段的含义：

- `materials`：组件协议描述列表（来自 `bundle.json`）。
- `whiteList`：允许 LLM 使用的 `componentName` 白名单（含原生标签如 `a`、`h1`~`h6`、`p`、`div` 与内置 `Text`）。**`bundle.json` 里注册的组件只有出现在白名单里，`genPrompt` 才会提供给大模型。**
- `wrapperComponent`：默认包裹组件，`genPrompt` 会让 LLM 尽量用该组件包裹根节点。
- `examples`：Prompt 示例 Schema，可按需提供，能让 LLM"照葫芦画瓢"。
- `rules`：物料侧生成规则，按需添加。

补上 `meta` 子路径入口：

```ts
// src/meta/index.ts
export * from './meta';
```

### 第四步：添加图标物料 {#step-4-icon-materials}

图标物料和普通组件完全一样，只多一步：**封装一个图标组件**，把 `name` 属性映射到具体图标。这样图标能在配置面板里按名称选择，大模型也能随手生成带图标的按钮。

#### 1. 封装图标组件

新建 `src/materials/components/NIconSvg.vue`，按 `name` 从 `@vicons/ionicons5` 里取对应图标：

```vue
<!-- src/materials/components/NIconSvg.vue -->
<script setup lang="ts">
import { computed, type Component } from 'vue';
import * as Icons from '@vicons/ionicons5';

const props = withDefaults(
  defineProps<{
    name: string;
  }>(),
  { name: '' },
);

const iconComponent = computed(() => {
  return (Icons as Record<string, Component | unknown>)[props.name] || null;
});
</script>

<template>
  <component :is="iconComponent" v-if="iconComponent" />
</template>
```

#### 2. 注册进组件清单

```ts
// src/materials/components/components.ts
import NIconSvg from './NIconSvg.vue';

export const components: IComponents = {
  NButton,
  NCard,
  NForm,
  NFormItem,
  NIconSvg,
  NInput,
  NSelect,
};
```

#### 3. 在 `bundle.json` 里描述它

图标组件就是一个普通组件，属性只有一个 `name`。用 `SelectIconConfigurator` 就能在配置面板里直接选图标：

```json
{
  "name": { "zh_CN": "图标" },
  "component": "NIconSvg",
  "description": "图标组件，name 为图标名，例如 SearchOutline、CheckmarkOutline",
  "schema": {
    "properties": [
      {
        "name": "0",
        "label": { "zh_CN": "基础属性" },
        "content": [
          {
            "property": "name",
            "label": { "text": { "zh_CN": "图标名称" } },
            "description": { "zh_CN": "图标名称，例如 SearchOutline（搜索）、CheckmarkOutline（对勾）" },
            "required": true,
            "type": "string",
            "cols": 12,
            "widget": { "component": "SelectIconConfigurator", "props": {} }
          }
        ]
      }
    ]
  }
}
```

#### 4. 加入白名单

```ts
// src/meta/white-list.ts
export const whiteList = [
  'NInput', 'NSelect', 'NButton', 'NForm', 'NFormItem', 'NCard', 'NIconSvg',
  'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ol', 'ul', 'li', 'label', 'div', 'span',
  'Text',
];
```

这样大模型就能随手生成带图标的按钮了，比如在 `NButton` 的 `icon` 插槽里放一个 `NIconSvg`。

### 第五步：暴露 npm 子路径 {#step-5-npm-subpaths}

`materials` 与 `meta` 是给不同消费方（前端渲染器 / 服务端 `genPrompt`）用的，应当通过 `package.json` 的 `exports` 声明为独立子路径。这样既能按需引入、避免把用不到的那份产物打进包，也让类型定义（`.d.ts`）跟随各自入口，类型更精确。

```json
{
  "name": "genui-materials-naive-ui",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".":          { "types": "./dist/index.d.ts",  "import": "./dist/index.js" },
    "./materials":{ "types": "./dist/materials.d.ts", "import": "./dist/materials.js" },
    "./meta":     { "types": "./dist/meta.d.ts",   "import": "./dist/meta.js" }
  },
  "scripts": {
    "build": "vite build"
  }
}
```

各入口的导出约定：

| 子路径 | 导出内容 | 类型 |
|--------|----------|------|
| `包名` | 一并导出 `materials` 与 `materialsMeta` | [`IMaterials`](#两个核心类型) / [`IMaterialsMeta`](#两个核心类型) |
| `包名/materials` | `materials` 对象（含 `components`、`requiredCompleteFieldSelectors`、`defaultPropsMap`） | `IMaterials` |
| `包名/meta` | `materialsMeta` 对象 | `IMaterialsMeta` |

> `materials` 与 `meta` 面向不同消费方，作为独立入口打包后，宿主应用与服务端可以各按所需引入对应子路径。

### 第六步：配置 Vite 构建

用 Vite 库模式，把 `index`、`materials`、`meta` 打成独立入口，并把依赖与 peer 依赖（`vue`、`naive-ui` 等）声明为 external：

```ts
// vite.config.ts
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import vue from '@vitejs/plugin-vue';
import packageJson from './package.json' with { type: 'json' };

const pkgRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [vue(), dts({ rollupTypes: true })],
  build: {
    lib: {
      entry: {
        index: join(pkgRoot, 'src/index.ts'),
        materials: join(pkgRoot, 'src/materials/index.ts'),
        meta: join(pkgRoot, 'src/meta/index.ts'),
      },
      formats: ['es'],
      fileName: (_, entryName) => `${entryName}.js`,
    },
    sourcemap: true,
    rollupOptions: {
      external: [
        ...Object.keys(packageJson.dependencies || {}),
        ...Object.keys(packageJson.peerDependencies || {}),
      ],
    },
  },
});
```

几点说明：

- `dts({ rollupTypes: true })`：把每个入口的声明文件合并成单个扁平文件（`dist/index.d.ts`、`dist/materials.d.ts`、`dist/meta.d.ts`），与[第五步](#step-5-npm-subpaths) `exports` 里声明的 `types` 路径一一对应；否则 `vite-plugin-dts` 会按 `src` 目录结构输出 `dist/materials/index.d.ts` 这类嵌套路径，与 `exports` 对不上。
- `pkgRoot = fileURLToPath(new URL('.', import.meta.url))`：本包声明了 `"type": "module"`，`vite.config.ts` 按 ESM 语义执行，`__dirname` 在 ESM 下并不存在，用这一行即可等价地取到当前目录（等价于 `__dirname`），入口路径再用 `join(pkgRoot, ...)` 拼接。
- `external` 同时取 `dependencies` 与 `peerDependencies`：`vue`、`naive-ui` 被放在 `peerDependencies`（宿主应用提供），若不 external 会被打进包，导致宿主与物料包各自持有一份组件实例。

### 第七步：发布到 npm

```bash
npm run build
npm publish --access public
```

发布后，你的物料包就可以像官方物料包一样被使用了。

## 在应用中使用自定义物料库

安装依赖：

```bash
npm install genui-materials-naive-ui naive-ui
```

前端渲染：通过 `GenuiConfigProvider` 注入 `materials`，渲染器即可按 `componentName` 渲染组件。

```vue
<script setup lang="ts">
import { GenuiChat, GenuiConfigProvider } from '@opentiny/genui-sdk-vue';
import { materials } from 'genui-materials-naive-ui/materials';
</script>

<template>
  <GenuiConfigProvider :materials="materials">
    <GenuiChat />
  </GenuiConfigProvider>
</template>
```

服务端生成 Prompt：通过 `genPrompt` 把 `materialsMeta` 拼进系统提示词，让 LLM 生成符合物料协议的 Schema。

```ts
import { genPrompt } from '@opentiny/genui-sdk-core';
import { materialsMeta } from 'genui-materials-naive-ui/meta';

const systemPrompt = genPrompt('Vue', materialsMeta);
```

## 物料包核心概述

一个物料包本质上就是一个 **npm 包**。它包含了两份核心材料：

- **组件说明书**：大模型需要知道"有哪些组件、每个组件有哪些属性、怎么用"，才能生成符合协议的 Schema。
- **组件清单**：拿到 LLM 返回的 Schema 后，需要把 `componentName` 渲染成真实组件。

所以，一个物料包核心只需对外提供两个产物：

| 产物 | 子路径 | 作用 | 消费方 |
|------|--------|------|--------|
| `materials` | `包名/materials` | 组件清单：`componentName → 组件` | 前端渲染器（`GenuiConfigProvider` 注入） |
| `meta` | `包名/meta` | Prompt 元数据：`IMaterialsMeta` | 服务端 `genPrompt`（拼进 System Prompt） |

### 目录结构：不强制

**官方对目录结构没有任何强制要求。** 实战示例中的结构只是一种推荐的划分方式。真正决定"是不是一个合法物料包"的只有两点：

1. `package.json` 的 `exports` 正确暴露了 `materials`、`meta` 两个子路径（见[第五步：暴露 npm 子路径](#step-5-npm-subpaths)）；
2. `materials`、`meta` 两个入口导出的对象，符合渲染器与 `genPrompt` 预期的类型契约。

### 两个核心类型

物料的全部"契约"就体现在两个类型上，它们都定义在 `@opentiny/genui-sdk-core`：

```typescript
// 渲染端：组件清单 + 缓冲字段 + 默认值映射
interface IMaterials {
  components?: Record<string, unknown>;      // 组件名 → 运行时组件
  requiredCompleteFieldSelectors?: string[]; // 缓冲字段选择器
  defaultPropsMap?: Record<string, any>;     // 组件默认 Props 映射
  [key: string]: any;                        // 允许扩展其他字段
}

// 生成端：物料协议 + 白名单 + 示例
interface IMaterialsMeta {
  materials: IMaterialsProtocol[];           // 物料协议数据（bundle.json）
  examples: IExample[];                      // Prompt 示例 Schema
  whiteList: string[];                       // 允许 LLM 使用的组件名白名单
  wrapperComponent?: string;                 // 默认包裹组件
  rules?: string[];                          // 物料侧生成规则
}
```

两个类型各司其职：

- **`IMaterials`**：交给前端渲染器（`GenuiConfigProvider` 注入）。渲染器拿到 Schema 里的 `componentName` 后，去 `components` 里找对应的 Vue 组件渲染；`defaultPropsMap` 用于流式渲染时补全尚未生成的属性；`requiredCompleteFieldSelectors` 用于声明"必须等字段完整才能渲染"的缓冲字段。
- **`IMaterialsMeta`**：交给服务端 `genPrompt`。`genPrompt` 会把 `materials`（组件协议，来自 `bundle.json`）与 `whiteList` 拼进 System Prompt，让 LLM 只使用白名单内的组件、并按照组件协议生成 Schema。

两个类型通过 **`componentName`** 对齐：`IMaterials.components` 的 key 就是 Schema 里的 `componentName`，并且必须与 `IMaterialsMeta` 中每个组件的 `component` 字段一一对应。

### `bundle.json` 的协议类型

`IMaterialsMeta.materials` 是一个 `IMaterialsProtocol[]`，而**一份 `bundle.json` 就是一个 `IMaterialsProtocol`**。它长这样：

```typescript
interface IMaterialsProtocol {
  data: {
    framework: string;                       // 'Vue' | 'React' | 'Angular' | ...
    materials: {
      components?: IComponent[];             // 组件协议描述
      packages?: IPackage[];
      snippets?: Array<ISnippetGroup | ISnippet>;
    };
  };
}
```

其中 `IComponent` 是单个组件的完整描述，也就是 `bundle.json` 里"每个组件"的结构：

```typescript
interface IComponent {
  name?: II18nText;                          // 组件显示名，如 { zh_CN: '输入框' }
  component?: string;                        // 组件名，对应渲染时的 componentName
  description?: string;                      // 组件说明（LLM 生成依据）
  npm?: INpmConfig;                          // 组件来源包信息
  schema?: IComponentSchema;                 // 属性、事件、插槽描述
}

interface IComponentSchema {
  properties?: IPropertyGroup[];             // 属性分组
  events?: Record<string, IEventConfig>;     // 事件
  slots?: Record<string, ISlotConfig>;       // 插槽
}
```

不需要把所有这些类型记下来 —— **`bundle.json` 的 JSON 结构本身就和 `IComponent` 一一对应**，照着[第三步的示例](#step-3-meta) 写 JSON 即可，类型只是对它的形式化描述。完整定义见 [Core API](../../components/core/api)。

## 物料库优化小技巧

- **补齐 `description`**：组件与属性的描述越详细，LLM 生成越准确，这是性价比最高的优化。
- **提供 `examples`**：在 `materialsMeta.examples` 中给出 1-2 个典型 Schema（如表单示例），LLM 会参考它组织结构。
- **配置缓冲字段**：如需避免流式渲染时组件因字段不完整而报错，可在 `materials.requiredCompleteFieldSelectors` 中声明关键字段路径（如 `[componentName=NSelect] > props > options`）。
