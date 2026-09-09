# Angular Material

`@opentiny/genui-sdk-materials-angular-angular-material` 基于 [Angular Material](https://material.angular.dev/) 的物料包，提供运行时组件映射与 Prompt 元数据。

类型定义见 [Core - IMaterials](../core/api#imaterials) / [IMaterialsMeta](../core/api#imaterialsmeta)。

## 导出

| 入口 | 导出 |
|------|------|
| `.` | `materials`、`materialsMeta` |
| `./materials` | `materials` |
| `./meta` | `materialsMeta` |

## materials

- **类型**: `IMaterials`
- **说明**: Angular Material 组件映射，注入 ConfigProvider。

```typescript
import { materials } from '@opentiny/genui-sdk-materials-angular-angular-material/materials';
```

```html
<genui-config-provider [materials]="materials">
  <genui-renderer ... />
</genui-config-provider>
```

宿主应用还需提供 Angular Material 运行前置条件：

```typescript
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideNativeDateAdapter } from '@angular/material/core';

providers: [
  provideAnimations(),
  // ...
]
```

以及引入主题样式，如 `@angular/material/prebuilt-themes/indigo-pink.css`。

## materialsMeta

- **类型**: `IMaterialsMeta`
- **说明**: 供服务端 [`genPrompt`](../core/api#genprompt) 使用。`wrapperComponent` 默认为 `MatCard`。

```typescript
import { genPrompt } from '@opentiny/genui-sdk-core';
import { materialsMeta } from '@opentiny/genui-sdk-materials-angular-angular-material/meta';

const systemPrompt = genPrompt('Angular', materialsMeta);
```

## 组件列表

- **基础组件**: `MatButton`、`MatIconButton`、`MatIcon`、`MatDivider`
- **表单组件**: `MatFormField`、`MatLabel`、`MatCheckbox`、`MatSlideToggle`、`MatSlider`、`MatSelect`、`MatOption`、`MatRadioGroup`、`MatRadioButton`、`MatButtonToggleGroup`、`MatButtonToggle`
- **布局组件**: `MatCard`（含 `MatCardHeader`/`MatCardTitle`/`MatCardSubtitle`/`MatCardContent`/`MatCardActions`）、`MatToolbar`、`MatList`、`MatListItem`、`MatExpansionPanel`（含 `MatExpansionPanelHeader`/`MatExpansionPanelTitle`）
- **导航组件**: `MatTabs`、`MatTab`
- **数据展示**: `MatPaginator`
- **反馈组件**: `MatProgressSpinner`、`MatProgressBar`

### 指令

| directiveName | 说明 |
|---------------|------|
| `matInput` | 应用到原生 `input`/`textarea`，作为 `MatFormField` 的控件（schema 中声明 `matInput: true` 会自动挂载） |
| `matSliderThumb` | 应用到 `MatSlider` 内的原生 `input`（`matSliderThumb: true`），用于拖动与 `ngModel` 绑定 |
| `matTooltip` | 任意元素上展示提示气泡（props 中提供 `matTooltip` 文案与 `matTooltipPosition`） |
| `matBadge` | 任意元素上的徽标（props 中提供 `matBadge` 数值） |

### 表单绑定

表单控件通过 `ngModel` 双向绑定，与渲染器内置的 `ngModel`/`defaultValueAccessor` 指令配合使用：

```json
{
  "componentName": "input",
  "props": {
    "matInput": true,
    "placeholder": "请输入姓名",
    "ngModel": { "type": "JSExpression", "model": true, "value": "this.state.name" }
  },
  "directives": [
    { "directiveName": "ngModel" },
    { "directiveName": "matInput" }
  ]
}
```

原生 `select` / `option` 也在白名单内：字符串 `value` 可直接用；对象必须写 `ngValue`（`NgSelectOption` 的 `{ host: true }` 由渲染器桥接到父级 `SelectControlValueAccessor`）。`MatSelect` / `MatOption` 没有这条 Host，不需要该桥。`ngModelGroup` 由渲染器子类去掉 `{ host: true }`，只保留 `skipSelf` 从父 injector 取 `ControlContainer`。

## 已知限制

`MatTable`（需 `matColumnDef`/`matCellDef` 模板指令）、`MatDatepicker`、`MatMenu`、`MatDialog` 等依赖模板引用或服务调用的组件暂未纳入白名单，简单表格请使用原生 `table` 标签（参考 `examples/grid.json`）。
