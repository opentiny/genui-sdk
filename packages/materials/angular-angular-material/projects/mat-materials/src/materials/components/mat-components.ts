import { Type } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCard, MatCardHeader } from '@angular/material/card';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatDivider } from '@angular/material/divider';
import { MatExpansionPanel, MatExpansionPanelHeader } from '@angular/material/expansion';
import { MatFormField } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatList, MatListItem } from '@angular/material/list';
import { MatPaginator } from '@angular/material/paginator';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatOption } from '@angular/material/core';
import { MatRadioButton } from '@angular/material/radio';
import { MatSelect } from '@angular/material/select';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatSlider } from '@angular/material/slider';
import { MatButtonToggle } from '@angular/material/button-toggle';
import { MatTab, MatTabGroup } from '@angular/material/tabs';
import { MatToolbar } from '@angular/material/toolbar';
import { matNativeElementComponentFactory } from '../native-element';

// MatLabel / MatCardTitle 等子结构是 directive（仅有 ɵdir），渲染器的 createComponent 只认
// 组件（ɵcmp）。用宿主元素组件承接，真实指令通过 directives + autoApplyDirectives 挂载。
export const components: Record<string, Type<any>> = {
  MatButton,
  MatIconButton,
  MatIcon,
  MatDivider,
  MatFormField,
  MatLabel: matNativeElementComponentFactory('mat-label'),
  MatCheckbox,
  MatSlideToggle,
  MatSlider,
  MatSelect,
  MatOption,
  MatRadioGroup: matNativeElementComponentFactory('mat-radio-group'),
  MatRadioButton,
  MatButtonToggleGroup: matNativeElementComponentFactory('mat-button-toggle-group'),
  MatButtonToggle,
  MatCard,
  MatCardHeader,
  MatCardTitle: matNativeElementComponentFactory('mat-card-title'),
  MatCardSubtitle: matNativeElementComponentFactory('mat-card-subtitle'),
  MatCardContent: matNativeElementComponentFactory('mat-card-content'),
  MatCardActions: matNativeElementComponentFactory('mat-card-actions'),
  MatToolbar,
  MatList,
  MatListItem,
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle: matNativeElementComponentFactory('mat-panel-title'),
  MatTabs: MatTabGroup,
  MatTab,
  MatPaginator,
  MatProgressSpinner,
  MatProgressBar,
};

// Angular Material 组件均为 standalone，无需 NgModule
export const modules: Record<string, Type<any>> = {};
