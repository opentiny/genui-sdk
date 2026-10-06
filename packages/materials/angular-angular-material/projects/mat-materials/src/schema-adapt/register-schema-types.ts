import { MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatFormField } from '@angular/material/form-field';
import { MatSlider } from '@angular/material/slider';
import {
  MatFooterRowDef,
  MatHeaderRowDef,
  MatRowDef,
  MatTextColumn,
} from '@angular/material/table';
import { adoptStandaloneType } from './adopt-standalone-type';
import { SchemaMatFormField } from './dynamic-crash/schema-mat-form-field';
import { SchemaMatHeaderRowDef, SchemaMatFooterRowDef, SchemaMatRowDef } from './dynamic-crash/schema-mat-row-defs';
import { SchemaMatSlider } from './dynamic-crash/schema-mat-slider';
import { SchemaMatTextColumn } from './dynamic-crash/schema-mat-text-column';
import { SchemaMatButtonToggleGroup } from './dynamic-timing/schema-mat-button-toggle-group';

/**
 * Re-apply after ng-packagr assigns ɵcmp/ɵdir on decorated subclasses.
 * Empty subclasses get Ivy defs here (they have none of their own).
 */
adoptStandaloneType(SchemaMatSlider, MatSlider);
adoptStandaloneType(SchemaMatFormField, MatFormField);
adoptStandaloneType(SchemaMatButtonToggleGroup, MatButtonToggleGroup);
adoptStandaloneType(SchemaMatTextColumn, MatTextColumn);
adoptStandaloneType(SchemaMatHeaderRowDef, MatHeaderRowDef);
adoptStandaloneType(SchemaMatRowDef, MatRowDef);
adoptStandaloneType(SchemaMatFooterRowDef, MatFooterRowDef);
