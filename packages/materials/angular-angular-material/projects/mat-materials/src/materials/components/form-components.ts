import '../../schema-adapt/register-schema-types';
import { Type } from '@angular/core';
import { SchemaMatButtonToggle } from '../../schema-adapt/dynamic-timing/schema-mat-button-toggle';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatOption } from '@angular/material/core';
import { MatRadioButton } from '@angular/material/radio';
import { MatSelect } from '@angular/material/select';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { SchemaMatFormField } from '../../schema-adapt/dynamic-crash/schema-mat-form-field';
import { SchemaMatSlider } from '../../schema-adapt/dynamic-crash/schema-mat-slider';
import { matNativeElementComponentFactory } from '../native-element';

/** base：表单控件 */
export const formComponents: Record<string, Type<any>> = {
  MatFormField: SchemaMatFormField,
  MatLabel: matNativeElementComponentFactory('mat-label'),
  MatHint: matNativeElementComponentFactory('mat-hint'),
  MatError: matNativeElementComponentFactory('mat-error'),
  MatCheckbox,
  MatSlideToggle,
  MatSlider: SchemaMatSlider,
  MatSelect,
  MatOption,
  MatRadioGroup: matNativeElementComponentFactory('mat-radio-group'),
  MatRadioButton,
  MatButtonToggleGroup: matNativeElementComponentFactory('mat-button-toggle-group'),
  MatButtonToggle: SchemaMatButtonToggle,
};

export const formModules: Record<string, Type<any>> = {};
