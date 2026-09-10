import { Type } from '@angular/core';
import { MatAutocomplete } from '@angular/material/autocomplete';
import {
  MatDatepicker,
  MatDatepickerToggle,
  MatDateRangePicker,
} from '@angular/material/datepicker';
import { MatExpansionPanel, MatExpansionPanelHeader } from '@angular/material/expansion';
import { MatGridList, MatGridTile } from '@angular/material/grid-list';
import {
  MatActionList,
  MatList,
  MatListItem,
  MatListOption,
  MatNavList,
  MatSelectionList,
} from '@angular/material/list';
import { MatSidenav, MatSidenavContainer, MatSidenavContent } from '@angular/material/sidenav';
import { MatStep, MatStepper } from '@angular/material/stepper';
import { MatTab, MatTabGroup, MatTabLink, MatTabNav, MatTabNavPanel } from '@angular/material/tabs';
import { MatTimepicker, MatTimepickerToggle } from '@angular/material/timepicker';
import { MatToolbar } from '@angular/material/toolbar';
import { matNativeElementComponentFactory } from '../native-element';

/** plus：布局壳 + 导航 + 表单增强（Datepicker / Autocomplete / Stepper） */
export const layoutComponents: Record<string, Type<any>> = {
  MatToolbar,
  MatSidenavContainer,
  MatSidenav,
  MatSidenavContent,
  MatGridList,
  MatGridTile,
  MatList,
  MatListItem,
  MatNavList,
  MatActionList,
  MatSelectionList,
  MatListOption,
  MatAccordion: matNativeElementComponentFactory('mat-accordion'),
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle: matNativeElementComponentFactory('mat-panel-title'),
  MatExpansionPanelDescription: matNativeElementComponentFactory('mat-panel-description'),
  MatExpansionPanelActionRow: matNativeElementComponentFactory('mat-action-row'),
  MatTabs: MatTabGroup,
  MatTab,
  MatTabNav,
  MatTabLink,
  MatTabNavPanel,
  MatAutocomplete,
  MatDatepicker,
  MatDateRangePicker,
  MatDatepickerToggle,
  MatTimepicker,
  MatTimepickerToggle,
  MatStepper,
  MatStep,
};

export const layoutModules: Record<string, Type<any>> = {};
