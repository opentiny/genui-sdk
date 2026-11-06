# GenuiConfigProvider 组件

`GenuiConfigProvider` 用于为 `GenuiRenderer` 注入组件物料，并驱动物料的主题与语言切换。

仅使用 ConfigProvider 时可从 `@opentiny/genui-sdk-react/config-provider` 按需引入，见 [安装与配置 - 按需引入](../../guide/react/install#按需引入)。

与 `GenuiRenderer` 一起使用时，通常需要通过 `materials` 注入组件物料，详见 [物料配置](../../guide/react/install#物料配置)。

## Props

### theme

- **类型**: `string`
- **必填**: 否
- **默认值**: `'light'`
- **说明**: 主题标识，例如 `light` / `dark`。ConfigProvider 会把 `theme`、`locale` 和系统深浅色交给物料声明的 `runtimeFactory`，并把 `apply()` 返回的 `root` 渲染在 `children` 外层。

### locale

- **类型**: `string`
- **必填**: 否
- **默认值**: `'zh_CN'`
- **说明**: 语言标识，使用 `language_REGION` 形式，例如 `zh_CN`、`en_US`。由物料 `runtimeFactory` 的 `apply()` 负责切换实际语言。

```tsx
<GenuiConfigProvider materials={materials} theme="dark" locale="en_US">
  <GenuiRenderer content={content} />
</GenuiConfigProvider>
```

### materials

- **类型**: `IMaterials | MergedMaterials`
- **必填**: 否（使用 `GenuiRenderer` 时需要配置）
- **说明**: 渲染器使用的组件物料。通常传入物料包，例如 `@opentiny/genui-sdk-materials-react-antd` 提供的 `materials` 对象；也可以通过 `mergeMaterials` 合并多个物料包。

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

### notify

- **类型**: `NotifyHandler`
- **必填**: 否
- **默认值**: `undefined`
- **说明**: 自定义渲染器通知回调。Schema 中 `JSFunction` 解析失败或执行报错时会调用；未配置时使用内置通知。

```ts
export type NotifyHandler = (options: {
  type?: 'success' | 'warning' | 'error' | 'info';
  title?: string;
  message?: string;
  duration?: number;
}) => void;
```

```tsx
<GenuiConfigProvider materials={materials} notify={(options) => console.log(options)}>
  <GenuiRenderer content={schema} />
</GenuiConfigProvider>
```


## 运行时 root

`materials.runtimeFactory` 可以是单个工厂，也可以是工厂数组。ConfigProvider 会按引用去重，并按顺序收集每个运行时 `apply()` 返回的 `root`，依次嵌套在 `children` 外层：

- `root` 必须是 React 组件；
- `root` 的组件引用应保持稳定，通常在工厂闭包里只创建一次；每次 `apply()` 新建组件会导致子树反复卸载重建；
- `theme` / `locale` 未传时使用默认值 `'light'` / `'zh_CN'`，并且始终会调用 `apply()`；
- 系统深浅色变化会重新 `apply()`，但不会重建未变化的 root。

当前 React Ant Design 物料返回的 root 是 Ant Design 的 `ConfigProvider`，同时承载主题算法和 locale。

## Hooks

ConfigProvider 同时导出两个读取上下文的 Hook：

```ts
function useGenuiMaterials(): IMaterials;
function useGenuiNotify(): NotifyHandler | undefined;
```

`useGenuiMaterials()` 返回当前注入的物料；`useGenuiNotify()` 返回配置的 Notify，未配置时为 `undefined`。

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
