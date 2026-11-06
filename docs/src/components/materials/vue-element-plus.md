# Vue Element Plus

`@opentiny/genui-sdk-materials-vue-element-plus` 基于 [Element Plus](https://element-plus.org/) 的物料包，提供运行时组件映射与 Prompt 元数据。

类型定义见 [Core - IMaterials](../core/api#imaterials) / [IMaterialsMeta](../core/api#imaterialsmeta)。

## 导出

| 入口 | 导出 |
|------|------|
| `.` | `materials`、`materialsMeta` |
| `./materials` | `materials` |
| `./meta` | `materialsMeta` |

## materials

- **类型**: `IMaterials`
- **说明**: Element Plus 组件映射，注入 [GenuiConfigProvider](../config-provider#materials)。内置 `runtimeFactory`，由一个稳定的 Runtime Root 持有 `ElConfigProvider`，统一处理 `light` / `dark` 主题与组件库 locale，避免两个 Provider 相互覆盖。本包 `locales` 目前打包 `zh_CN` / `en_US`；需要更多语言时往该数组追加 `{ id, pack }`。详见 [物料运行时](../core/api#imaterialsruntime) 与 [国际化配置](../../examples/config-provider/i18n)。设置 ConfigProvider 的 `theme` 和 `locale` 即可切换：

```typescript
import 'element-plus/dist/index.css';
import { materials } from '@opentiny/genui-sdk-materials-vue-element-plus/materials';
import { GenuiChat, GenuiConfigProvider } from '@opentiny/genui-sdk-vue';
```

```vue
<GenuiConfigProvider :materials="materials">
  <GenuiChat />
</GenuiConfigProvider>
```

```vue
<GenuiConfigProvider :materials="materials" theme="dark">
  <GenuiChat />
</GenuiConfigProvider>
```

## materialsMeta

- **类型**: `IMaterialsMeta`
- **说明**: 供服务端 [`genPrompt`](../core/api#genprompt) 使用。`wrapperComponent` 默认为 `ElCard`。

```typescript
import { genPrompt } from '@opentiny/genui-sdk-core';
import { materialsMeta } from '@opentiny/genui-sdk-materials-vue-element-plus/meta';

const systemPrompt = genPrompt('Vue', materialsMeta);
```
