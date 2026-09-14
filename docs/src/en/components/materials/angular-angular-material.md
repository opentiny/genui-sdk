# Angular Material

`@opentiny/genui-sdk-materials-angular-angular-material` is the Angular Material materials package for GenUI: runtime component maps plus prompt metadata.

See [Core - IMaterials](../core/api#imaterials) / [IMaterialsMeta](../core/api#imaterialsmeta) for types.

## Exports

| Entry | Exports |
|------|------|
| `.` | `materials`, `plusMaterials`, `maxMaterials`, `proMaterials`, matching `*MaterialsMeta`, `applyMaterialPatch` |
| `./materials` | `materials`, `plusMaterials`, `maxMaterials`, `proMaterials` |
| `./meta` | `materialsMeta`, `plusMaterialsMeta`, `maxMaterialsMeta`, `proMaterialsMeta` |

## Material Tiers

Cumulative material tiers (`base ⊂ plus ⊂ max ⊂ pro`):

| Tier | Runtime / Meta | Contents |
|------|----------------|----------|
| **base** | `materials` / `materialsMeta` | Basics + form + `MatCard*` + `MatTable*` (incl. Fab / Hint / Error) |
| **plus** | `plusMaterials` / `plusMaterialsMeta` | base + layout/nav + Datepicker / Autocomplete / Stepper |
| **max** | `maxMaterials` / `maxMaterialsMeta` | plus + Progress + Menu |
| **pro** | `proMaterials` / `proMaterialsMeta` | max + chips / Paginator / Tree / Sort (full set) |

```typescript
import { proMaterials } from '@opentiny/genui-sdk-materials-angular-angular-material/materials';
import { proMaterialsMeta } from '@opentiny/genui-sdk-materials-angular-angular-material/meta';
```

```html
<genui-config-provider [materials]="proMaterials">
  <genui-renderer ... />
</genui-config-provider>
```

The host app still needs Angular Material runtime setup (`provideAnimations`, theme CSS; add `provideNativeDateAdapter` when using Datepicker).

## Components (pro)

- **Basic**: `MatButton`, `MatIconButton`, `MatFabButton`, `MatMiniFabButton`, `MatIcon`, `MatDivider`
- **Form controls**: `MatFormField`, `MatLabel`, `MatHint`, `MatError`, `MatCheckbox`, `MatSlideToggle`, `MatSlider`, `MatSelect`, `MatOption`, `MatRadioGroup`, `MatRadioButton`, `MatButtonToggleGroup`, `MatButtonToggle`, `MatAutocomplete`, `MatDatepicker`, `MatDateRangePicker`, `MatDatepickerToggle`, `MatTimepicker`, `MatTimepickerToggle`
- **Layout**: `MatCard*`, `MatToolbar`, `MatSidenav*`, `MatGridList`/`MatGridTile`, `MatList*` variants, `MatAccordion`, `MatExpansionPanel*`
- **Navigation**: `MatTabs`, `MatTab`, `MatTabNav`, `MatTabLink`, `MatTabNavPanel`, `MatStepper`, `MatStep`
- **Table (base)**: `MatTable`, `MatTextColumn`, `MatHeaderRow`, `MatRow`, `MatFooterRow`, `MatHeaderCell`, `MatCell`, `MatFooterCell`
- **Data display (pro)**: `MatChipSet`, `MatChip`, `MatChipListbox`, `MatChipOption`, `MatChipGrid`, `MatChipRow`, `MatPaginator`, `MatSortHeader`, `MatTree`, `MatTreeNode`
- **Feedback**: `MatProgressSpinner`, `MatProgressBar`, `MatMenu`, `MatMenuItem`

### Directives

| directiveName | Description |
|---------------|-------------|
| `matInput` | Native `input`/`textarea` as a `MatFormField` control (`matInput: true` auto-applies) |
| `matPrefix` / `matSuffix` | Form field prefix / suffix |
| `matSliderThumb` | Thumb inside `MatSlider` |
| `matTooltip` / `matBadge` | Tooltip / badge |
| `matAutocomplete` / `matDatepicker` / `matTimepicker` | Bind an input to the panel instance |
| `matMenuTriggerFor` | Menu trigger (value is a `MatMenu` instance) |
| `matChipRemove` / `matChipAvatar` / `matChipInputFor` | Chip remove / avatar / input-for grid |
| `matSort` | Sort host on a table |
| `matColumnDef` / `matHeaderCellDef` / `matCellDef` / `matFooterCellDef` | Column and cell templates (`NgTemplate` / `ng-container`); columns accept `sticky` / `stickyEnd` |
| `matHeaderRowDef` / `matRowDef` / `matFooterRowDef` / `matNoDataRow` | Header / data / footer / empty-row templates; rows accept `matHeaderRowDefSticky` / `matFooterRowDefSticky` |
| `matHeaderCell` / `matCell` / `matFooterCell` | Cell hosts on `th` / `td` |

## Known limitations

- `MatDialog` / `MatSnackBar` / `MatBottomSheet` are service-driven and are not schema root components.
- Menu / Autocomplete / Datepicker / ChipGrid need `ref` + `JSExpression` to pass the component instance into the trigger directive.
- Use `MatTable` with `ng-container` + `matColumnDef` and `NgTemplate` structural row/cell directives; simple columns can use `MatTextColumn` (see `examples/grid.json` and the demo `page.json`). Schema `ng-container` is an element host placeholder (the renderer cannot create Angular's comment-based `ng-container`); with native `table[mat-table]` the client often does not project column hosts into the DOM, so layout is usually unaffected.
- Sticky columns/rows need a scrollable wrapper (e.g. `max-height` + `overflow: auto`).
- Full `MatTree` node templates still rely on data sources and structural directives.
