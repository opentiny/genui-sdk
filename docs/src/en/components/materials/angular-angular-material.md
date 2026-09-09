# Angular Material

`@opentiny/genui-sdk-materials-angular-angular-material` is a materials package based on [Angular Material](https://material.angular.dev/), providing runtime component mappings and prompt metadata.

Type definitions: see [Core - IMaterials](../core/api#imaterials) / [IMaterialsMeta](../core/api#imaterialsmeta).

## Exports

| Entry | Exports |
|-------|---------|
| `.` | `materials`、`materialsMeta` |
| `./materials` | `materials` |
| `./meta` | `materialsMeta` |

## materials

- **Type**: `IMaterials`
- **Description**: Angular Material component mappings, injected into ConfigProvider.

```typescript
import { materials } from '@opentiny/genui-sdk-materials-angular-angular-material/materials';
```

```html
<genui-config-provider [materials]="materials">
  <genui-renderer ... />
</genui-config-provider>
```

The host app must also provide Angular Material prerequisites:

```typescript
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideNativeDateAdapter } from '@angular/material/core';

providers: [
  provideAnimations(),
  // ...
]
```

and import a theme, e.g. `@angular/material/prebuilt-themes/indigo-pink.css`.

## materialsMeta

- **Type**: `IMaterialsMeta`
- **Description**: Used by server-side [`genPrompt`](../core/api#genprompt). `wrapperComponent` defaults to `MatCard`.

```typescript
import { genPrompt } from '@opentiny/genui-sdk-core';
import { materialsMeta } from '@opentiny/genui-sdk-materials-angular-angular-material/meta';

const systemPrompt = genPrompt('Angular', materialsMeta);
```

## Components

- **Basic**: `MatButton`, `MatIconButton`, `MatIcon`, `MatDivider`
- **Form controls**: `MatFormField`, `MatLabel`, `MatCheckbox`, `MatSlideToggle`, `MatSlider`, `MatSelect`, `MatOption`, `MatRadioGroup`, `MatRadioButton`, `MatButtonToggleGroup`, `MatButtonToggle`
- **Layout**: `MatCard` (incl. `MatCardHeader`/`MatCardTitle`/`MatCardSubtitle`/`MatCardContent`/`MatCardActions`), `MatToolbar`, `MatList`, `MatListItem`, `MatExpansionPanel` (incl. `MatExpansionPanelHeader`/`MatExpansionPanelTitle`)
- **Navigation**: `MatTabs`, `MatTab`
- **Data display**: `MatPaginator`
- **Feedback**: `MatProgressSpinner`, `MatProgressBar`

### Directives

| directiveName | Description |
|---------------|-------------|
| `matInput` | Applied to native `input`/`textarea` elements as a `MatFormField` control (auto-applied when the schema declares `matInput: true`) |
| `matSliderThumb` | Applied to a native `input` inside `MatSlider` (`matSliderThumb: true`) for dragging and `ngModel` binding |
| `matTooltip` | Tooltip on any element (provide `matTooltip` text and `matTooltipPosition` via props) |
| `matBadge` | Badge on any element (provide a `matBadge` value via props) |

### Form binding

Form controls use `ngModel` two-way binding together with the renderer's built-in `ngModel`/`defaultValueAccessor` directives:

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

Native `select` / `option` are also on the whitelist: a string `value` works as-is; object options need `ngValue` (the renderer bridges `NgSelectOption`'s `{ host: true }` to the parent `SelectControlValueAccessor`). `MatSelect` / `MatOption` do not use that Host lookup. `ngModelGroup` is a renderer subclass that drops `{ host: true }` and keeps `skipSelf` so it can read `ControlContainer` from the parent injector.

## Known limitations

`MatTable` (needs `matColumnDef`/`matCellDef` template directives), `MatDatepicker`, `MatMenu` and `MatDialog` rely on template references or service calls and are not yet in the whitelist. For simple tables, use the native `table` element instead (see `examples/grid.json`).
