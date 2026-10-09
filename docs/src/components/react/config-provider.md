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
