# @opentiny/genui-sdk-materials-angular-devui

基于 [ng-devui](https://devui.design/) 的 GenUI Angular 物料包，提供 schema 驱动页面生成所需的运行时组件映射与 Prompt 元数据。

> 注意：`ng-devui@18` 官方 peer 为 Angular 18；本仓库 Angular 框架为 20，接入时可能需要放宽 peer 依赖校验。图表组件（折线/柱状/饼图）由物料包基于 ECharts 封装，非 DevUI 官方组件。

## Install

```bash
npm install @opentiny/genui-sdk-materials-angular-devui ng-devui @opentiny/genui-sdk-core
```

应用入口需引入 DevUI 样式：

```ts
import 'ng-devui/devui.min.css';
```

## Quick Start

### Frontend Rendering

```ts
import { materials } from '@opentiny/genui-sdk-materials-angular-devui/materials';
```

```html
<genui-config-provider [materials]="materials">
  <genui-renderer ... />
</genui-config-provider>
```

### Generate LLM Prompt (Server)

```ts
import { genPrompt } from '@opentiny/genui-sdk-core';
import { materialsMeta } from '@opentiny/genui-sdk-materials-angular-devui/meta';

const systemPrompt = genPrompt('Angular', materialsMeta, customConfig);
```

`materialsMeta.wrapperComponent` 默认为 `DCard`。

## Components

| componentName | 来源 | 说明 |
|---------------|------|------|
| `DCard` / `DCardHeader` | ng-devui Card | 卡片容器 |
| `DDatePicker` | ng-devui DatepickerPro | 日期选择器 |
| `DDataTable` / `DColumn` | ng-devui DataTable | 数据表格 |
| `DLineChart` / `DBarChart` / `DPieChart` | ECharts 封装 | 折线 / 柱状 / 饼图 |

## API

| Export Path | Exports | Description |
|-------------|---------|-------------|
| `@opentiny/genui-sdk-materials-angular-devui` | `materials`, `materialsMeta` | Unified entry |
| `.../materials` | `materials` | Inject into ConfigProvider |
| `.../meta` | `materialsMeta` | For `genPrompt()` |

## More

- [DevUI DataTable](https://devui.design/components/zh-cn/datatable/demo#basic-usage)
- [GenUI SDK](https://opentiny.design/genui-sdk)
