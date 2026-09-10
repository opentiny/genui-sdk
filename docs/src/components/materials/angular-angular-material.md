# Angular Material

`@opentiny/genui-sdk-materials-angular-angular-material` 基于 [Angular Material](https://material.angular.dev/) 的物料包，提供运行时组件映射与 Prompt 元数据。

类型定义见 [Core - IMaterials](../core/api#imaterials) / [IMaterialsMeta](../core/api#imaterialsmeta)。

## 导出

| 入口 | 导出 |
|------|------|
| `.` | `materials`、`plusMaterials`、`maxMaterials`、`proMaterials`、对应 `*MaterialsMeta`、`applyMaterialPatch` |
| `./materials` | `materials`、`plusMaterials`、`maxMaterials`、`proMaterials` |
| `./meta` | `materialsMeta`、`plusMaterialsMeta`、`maxMaterialsMeta`、`proMaterialsMeta` |

## Material Tiers

与 ng-devui 物料包一致，按累积层级拆分（`base ⊂ plus ⊂ max ⊂ pro`）：

| Tier | 运行时 / Meta | 内容 |
|------|----------------|------|
| **base** | `materials` / `materialsMeta` | 基础 + 表单 + `MatCard*`（含 Fab / Hint / Error） |
| **plus** | `plusMaterials` / `plusMaterialsMeta` | base + 布局/导航 + Datepicker / Autocomplete / Stepper |
| **max** | `maxMaterials` / `maxMaterialsMeta` | plus + Progress + Menu |
| **pro** | `proMaterials` / `proMaterialsMeta` | max + 碎片 / Table / Tree / Sort（全量） |

```typescript
import { proMaterials } from '@opentiny/genui-sdk-materials-angular-angular-material/materials';
import { proMaterialsMeta } from '@opentiny/genui-sdk-materials-angular-angular-material/meta';
```

```html
<genui-config-provider [materials]="proMaterials">
  <genui-renderer ... />
</genui-config-provider>
```

宿主应用还需提供 Angular Material 运行前置条件（`provideAnimations`、主题 CSS；使用 Datepicker 时还需 `provideNativeDateAdapter`）。

## 组件列表（pro）

- **基础组件**: `MatButton`、`MatIconButton`、`MatFabButton`、`MatMiniFabButton`、`MatIcon`、`MatDivider`
- **表单组件**: `MatFormField`、`MatLabel`、`MatHint`、`MatError`、`MatCheckbox`、`MatSlideToggle`、`MatSlider`、`MatSelect`、`MatOption`、`MatRadioGroup`、`MatRadioButton`、`MatButtonToggleGroup`、`MatButtonToggle`、`MatAutocomplete`、`MatDatepicker`、`MatDateRangePicker`、`MatDatepickerToggle`、`MatTimepicker`、`MatTimepickerToggle`
- **布局组件**: `MatCard*`、`MatToolbar`、`MatSidenav*`、`MatGridList`/`MatGridTile`、`MatList*` 变体、`MatAccordion`、`MatExpansionPanel*`
- **导航组件**: `MatTabs`、`MatTab`、`MatTabNav`、`MatTabLink`、`MatTabNavPanel`、`MatStepper`、`MatStep`
- **数据展示**: `MatChipSet`、`MatChip`、`MatChipListbox`、`MatChipOption`、`MatChipGrid`、`MatChipRow`、`MatPaginator`、`MatTable`、`MatTextColumn`、`MatTableColumn`、`MatTableHeaderRow`、`MatTableDataRow`、`MatSortHeader`、`MatTree`、`MatTreeNode`
- **反馈组件**: `MatProgressSpinner`、`MatProgressBar`、`MatMenu`、`MatMenuItem`

### 指令

| directiveName | 说明 |
|---------------|------|
| `matInput` | 原生 `input`/`textarea` 作为 `MatFormField` 控件（`matInput: true` 自动挂载） |
| `matPrefix` / `matSuffix` | 表单前后缀 |
| `matSliderThumb` | `MatSlider` 内拇指 |
| `matTooltip` / `matBadge` | 提示 / 徽标 |
| `matAutocomplete` / `matDatepicker` / `matTimepicker` | 输入框绑定对应面板实例 |
| `matMenuTriggerFor` | 菜单触发（值为 `MatMenu` 实例） |
| `matChipRemove` / `matChipAvatar` / `matChipInputFor` | 碎片移除 / 头像 / 输入关联 |
| `matSort` | 表格排序宿主 |

## 已知限制

- `MatDialog` / `MatSnackBar` / `MatBottomSheet` 为服务打开，不纳入 schema 根组件。
- Menu / Autocomplete / Datepicker / ChipGrid 等需通过 `ref` + `JSExpression` 把组件实例传给触发指令。
- `MatTable` 通过 `MatTextColumn` / `MatTableColumn` + `MatTableHeaderRow` / `MatTableDataRow` 使用；自定义单元格见 `MatTableColumn` + `NgTemplate`（`examples/grid.json`、demo `page.json`）。
- `MatTree` 完整节点模板仍依赖数据源与结构指令。
