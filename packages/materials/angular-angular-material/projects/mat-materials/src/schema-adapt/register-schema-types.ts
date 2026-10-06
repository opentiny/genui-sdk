import { MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatSlider } from '@angular/material/slider';
import { adoptStandaloneType } from './adopt-standalone-type';
import { SchemaMatSlider } from './dynamic-crash/schema-mat-slider';
import { SchemaMatButtonToggleGroup } from './dynamic-timing/schema-mat-button-toggle-group';

/**
 * Re-apply after ng-packagr assigns ɵcmp/ɵdir on decorated subclasses.
 * Empty subclasses get Ivy defs here (they have none of their own).
 */
adoptStandaloneType(SchemaMatSlider, MatSlider);
adoptStandaloneType(SchemaMatButtonToggleGroup, MatButtonToggleGroup);
