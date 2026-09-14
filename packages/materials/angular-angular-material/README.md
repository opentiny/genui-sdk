# @opentiny/genui-sdk-materials-angular-angular-material

A GenUI Angular materials package based on [Angular Material](https://material.angular.dev/), providing materials metadata for schema-driven page generation.

## Install

```bash
npm install @opentiny/genui-sdk-materials-angular-angular-material @opentiny/genui-sdk-core
```

Your Angular app also needs the Angular Material prerequisites:

```ts
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideNativeDateAdapter } from '@angular/material/core';

providers: [
  provideAnimations(),
  provideNativeDateAdapter(), // Datepicker / Timepicker
  // ...
]
```

and an Angular Material theme, e.g. `@angular/material/prebuilt-themes/indigo-pink.css`.

## Quick Start

### Generate LLM Prompt (Server)

```ts
import { genPrompt } from '@opentiny/genui-sdk-core';
import { proMaterialsMeta } from '@opentiny/genui-sdk-materials-angular-angular-material/meta';

const systemPrompt = genPrompt('Angular', proMaterialsMeta, customConfig);
```

`wrapperComponent` defaults to `MatCard`. Prefer a tier meta that matches the runtime materials you inject.

### Renderer Materials (ConfigProvider)

```ts
import { proMaterials } from '@opentiny/genui-sdk-materials-angular-angular-material/materials';
```

```html
<genui-config-provider [materials]="proMaterials">
  <genui-renderer ... />
</genui-config-provider>
```

## API

| Export Path | Exports | Description |
|-------------|---------|-------------|
| `@opentiny/genui-sdk-materials-angular-angular-material` | `materials`, `plusMaterials`, `maxMaterials`, `proMaterials`, `materialsMeta`, `plusMaterialsMeta`, `maxMaterialsMeta`, `proMaterialsMeta`, `applyMaterialPatch` | Unified entry |
| `.../meta` | `materialsMeta`, `plusMaterialsMeta`, `maxMaterialsMeta`, `proMaterialsMeta` | For `genPrompt()` |
| `.../materials` | `materials`, `plusMaterials`, `maxMaterials`, `proMaterials` | For `genui-config-provider [materials]` |
| `.../patch` | side-effect / `applyMaterialPatch` | Runtime patches for Material form-field edge cases |

## Material Tiers

物料按累积 tier 拆分（`base ⊂ plus ⊂ max ⊂ pro`）。每层有独立的组件/指令 map、whitelist 与 bundle JSON：

| Tier | Export | Contents |
|------|--------|----------|
| **base** | `materials` / `materialsMeta` | 基础 + 表单 + `MatCard*` + `MatTable*`（含 Fab / Hint / Error） |
| **plus** | `plusMaterials` / `plusMaterialsMeta` | base + 布局/导航 + Datepicker / Autocomplete / Stepper |
| **max** | `maxMaterials` / `maxMaterialsMeta` | plus + Progress + Menu |
| **pro** | `proMaterials` / `proMaterialsMeta` | max + 碎片 / Paginator / Tree / Sort（全量） |

分类目录：

- `components/basic-components.ts` / `form-components.ts` / `table-components.ts` — base
- `components/layout-components.ts` — plus
- `components/feedback-components.ts` — max
- `components/data-components.ts` — pro
- `directives/base-directives.ts` / `table-directives.ts` / `layout-directives.ts` / `feedback-directives.ts` / `data-directives.ts`

对应 meta JSON：

- `bundle.json` — base
- `plus-layout.json` — plus
- `max-feedback.json` — max
- `pro-data.json` — pro

### Tier breakdown

**base** — Button/Fab/Icon/Divider，表单（含 `MatHint`/`MatError`，`matPrefix`/`matSuffix`），`MatCard*`（含 Footer / TitleGroup），`MatTable` / `MatTextColumn` / 行单元格，以及 `matInput` / `matTooltip` / `matBadge`。

**plus** — Toolbar、Sidenav*、GridList*、List 变体、Accordion / Expansion*、Tabs / TabNav*、Autocomplete、Datepicker / Timepicker、Stepper。

**max** — Progress*、Menu / MenuItem（`matMenuTriggerFor`）。

**pro** — Chip*（含 ChipGrid / ChipRow）、Paginator、SortHeader、Tree / TreeNode。

## Included Components（pro 全量）

- **基础组件**: `MatButton`, `MatIconButton`, `MatFabButton`, `MatMiniFabButton`, `MatIcon`, `MatDivider`
- **表单组件**: `MatFormField`, `MatLabel`, `MatHint`, `MatError`, `MatCheckbox`, `MatSlideToggle`, `MatSlider`, `MatSelect`, `MatOption`, `MatRadioGroup`, `MatRadioButton`, `MatButtonToggleGroup`, `MatButtonToggle`, `MatAutocomplete`, `MatDatepicker`, `MatDateRangePicker`, `MatDatepickerToggle`, `MatTimepicker`, `MatTimepickerToggle`
- **布局组件**: `MatCard*`, `MatToolbar`, `MatSidenav*`, `MatGridList`/`MatGridTile`, `MatList*` 变体, `MatAccordion`, `MatExpansionPanel*`
- **导航组件**: `MatTabs`, `MatTab`, `MatTabNav`, `MatTabLink`, `MatTabNavPanel`, `MatStepper`, `MatStep`
- **表格（base）**: `MatTable`, `MatTextColumn`, `MatHeaderRow`, `MatRow`, `MatFooterRow`, `MatHeaderCell`, `MatCell`, `MatFooterCell`
- **数据展示（pro）**: `MatChipSet`, `MatChip`, `MatChipListbox`, `MatChipOption`, `MatChipGrid`, `MatChipRow`, `MatPaginator`, `MatSortHeader`, `MatTree`, `MatTreeNode`
- **反馈组件**: `MatProgressSpinner`, `MatProgressBar`, `MatMenu`, `MatMenuItem`

### Directives

| directiveName | Tier | Description |
|---------------|------|-------------|
| `matInput` | base | 原生 `input`/`textarea` 作为 `MatFormField` 控件（`matInput: true` 自动挂载） |
| `matPrefix` / `matSuffix` | base | 表单前后缀（`matPrefix` / `matIconPrefix` / `matTextPrefix` 等） |
| `matSliderThumb` | base | `MatSlider` 内拇指（`matSliderThumb: true`） |
| `matTooltip` / `matBadge` | base | 通用提示 / 徽标 |
| `matCardImage` / `matCardAvatar` | base | 卡片图片 / 头像 |
| `matAutocomplete` / `matDatepicker` / `matTimepicker` | plus | 输入框绑定对应面板实例 |
| `matStepperNext` / `matStepperPrevious` | plus | 步进器前进 / 后退 |
| `matMenuTriggerFor` | max | 菜单触发（值为 `MatMenu` 实例，常用 `ref`） |
| `matChipRemove` / `matChipAvatar` / `matChipInputFor` | pro | 碎片移除 / 头像 / 输入关联 `MatChipGrid` |
| `matSort` | pro | 表格排序宿主 |

## Regenerate bundles

```bash
node scripts/gen-bundle.mjs
```

## Limitations

- `MatDialog` / `MatSnackBar` / `MatBottomSheet` 为服务打开，不纳入 schema 根组件。
- `MatMenu` / `MatAutocomplete` / `MatDatepicker` / `MatChipGrid` 等需通过 `props.ref` + `JSExpression` 把组件实例传给触发指令（如 `matMenuTriggerFor`）。
- `MatTable` 使用官方结构指令：`ng-container` + `matColumnDef`（可 `sticky`/`stickyEnd`），`NgTemplate` + `matHeaderCellDef` / `matCellDef` / `matFooterCellDef` / `matHeaderRowDef` / `matRowDef` / `matFooterRowDef` / `matNoDataRow`；简单列可用 `MatTextColumn`。详见 [结构指令直写 Schema](../../../docs/inner-docs/mat-table-structural-directives-todo.md)。
- Schema `ng-container` 是元素宿主占位（非 Angular 注释型 ng-container）；native `table[mat-table]` 客户端通常不把列宿主投影进 DOM。
- Sticky 需外层可滚动容器（`max-height` + `overflow: auto`）。
- `MatTree` 完整节点模板仍依赖数据源与结构指令。

## More

- [GenUI SDK](https://opentiny.design/genui-sdk)
