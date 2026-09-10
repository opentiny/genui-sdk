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

Same cumulative model as the ng-devui materials package (`base ⊂ plus ⊂ max ⊂ pro`):

| Tier | Runtime / Meta | Contents |
|------|----------------|----------|
| **base** | `materials` / `materialsMeta` | Basics + form + `MatCard*` (incl. Fab / Hint / Error) |
| **plus** | `plusMaterials` / `plusMaterialsMeta` | base + layout/nav + Datepicker / Autocomplete / Stepper |
| **max** | `maxMaterials` / `maxMaterialsMeta` | plus + Progress + Menu |
| **pro** | `proMaterials` / `proMaterialsMeta` | max + chips / Table / Tree / Sort (full set) |

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
- **Data display**: `MatChipSet`, `MatChip`, `MatChipListbox`, `MatChipOption`, `MatChipGrid`, `MatChipRow`, `MatPaginator`, `MatTable`, `MatTextColumn`, `MatTableColumn`, `MatTableHeaderRow`, `MatTableDataRow`, `MatSortHeader`, `MatTree`, `MatTreeNode`
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

## Known limitations

- `MatDialog` / `MatSnackBar` / `MatBottomSheet` are service-driven and are not schema root components.
- Menu / Autocomplete / Datepicker / ChipGrid need `ref` + `JSExpression` to pass the component instance into the trigger directive.
- Use `MatTable` with `MatTextColumn` / `MatTableColumn` plus `MatTableHeaderRow` / `MatTableDataRow` bridges; custom cells use `MatTableColumn` + `NgTemplate` (see `examples/grid.json` and the demo `page.json`).
- Full `MatTree` node templates still rely on data sources and structural directives.
