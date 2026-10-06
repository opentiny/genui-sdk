import { MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatFormField } from '@angular/material/form-field';
import { MatRadioGroup } from '@angular/material/radio';
import { MatSlider } from '@angular/material/slider';
import {
  MatFooterRow,
  MatFooterRowDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatRow,
  MatRowDef,
  MatTable,
  MatTextColumn,
} from '@angular/material/table';
import { adoptStandaloneType } from './adopt-standalone-type';
import { SchemaMatFormField } from './dynamic-crash/schema-mat-form-field';
import { SchemaMatHeaderRowDef, SchemaMatFooterRowDef, SchemaMatRowDef } from './dynamic-crash/schema-mat-row-defs';
import { SchemaMatSlider } from './dynamic-crash/schema-mat-slider';
import { SchemaMatTextColumn } from './dynamic-crash/schema-mat-text-column';
import { SchemaMatButtonToggleGroup } from './dynamic-timing/schema-mat-button-toggle-group';
import { SchemaMatRadioGroup } from './dynamic-timing/schema-mat-radio-group';
import {
  SchemaMatFooterRow,
  SchemaMatHeaderRow,
  SchemaMatRow,
  SchemaMatTable,
} from './dynamic-timing/schema-mat-table';

/**
 * Re-apply after ng-packagr assigns ɵcmp/ɵdir on decorated subclasses.
 * Empty subclasses get Ivy defs here (they have none of their own).
 */
adoptStandaloneType(SchemaMatSlider, MatSlider);
adoptStandaloneType(SchemaMatFormField, MatFormField);
adoptStandaloneType(SchemaMatButtonToggleGroup, MatButtonToggleGroup);
adoptStandaloneType(SchemaMatRadioGroup, MatRadioGroup);
adoptStandaloneType(SchemaMatTable, MatTable);
adoptStandaloneType(SchemaMatHeaderRow, MatHeaderRow);
adoptStandaloneType(SchemaMatRow, MatRow);
adoptStandaloneType(SchemaMatFooterRow, MatFooterRow);
adoptStandaloneType(SchemaMatTextColumn, MatTextColumn);
adoptStandaloneType(SchemaMatHeaderRowDef, MatHeaderRowDef);
adoptStandaloneType(SchemaMatRowDef, MatRowDef);
adoptStandaloneType(SchemaMatFooterRowDef, MatFooterRowDef);
