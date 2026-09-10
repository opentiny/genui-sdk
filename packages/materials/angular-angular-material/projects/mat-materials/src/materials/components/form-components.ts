import { Type } from '@angular/core';
import { MatButtonToggle } from '@angular/material/button-toggle';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatOption } from '@angular/material/core';
import { MatFormField } from '@angular/material/form-field';
import { MatRadioButton } from '@angular/material/radio';
import { MatSelect } from '@angular/material/select';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatSlider } from '@angular/material/slider';
import { matNativeElementComponentFactory } from '../native-element';

/** base：表单控件 */
export const formComponents: Record<string, Type<any>> = {
  MatFormField,
  MatLabel: matNativeElementComponentFactory('mat-label'),
  MatHint: matNativeElementComponentFactory('mat-hint'),
  MatError: matNativeElementComponentFactory('mat-error'),
  MatCheckbox,
  MatSlideToggle,
  MatSlider,
  MatSelect,
  MatOption,
  MatRadioGroup: matNativeElementComponentFactory('mat-radio-group'),
  MatRadioButton,
  MatButtonToggleGroup: matNativeElementComponentFactory('mat-button-toggle-group'),
  MatButtonToggle,
};

export const formModules: Record<string, Type<any>> = {};
