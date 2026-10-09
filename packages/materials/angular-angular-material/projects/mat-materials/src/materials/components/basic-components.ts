import { Type } from '@angular/core';
import { MatButton, MatFabButton, MatIconButton, MatMiniFabButton } from '@angular/material/button';
import { MatCard, MatCardHeader, MatCardTitleGroup } from '@angular/material/card';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { matNativeElementComponentFactory } from '../native-element';

/** base：基础组件 + Card 骨架 */
export const basicComponents: Record<string, Type<any>> = {
  MatButton,
  MatIconButton,
  MatFabButton,
  MatMiniFabButton,
  MatIcon,
  MatDivider,
  MatCard,
  MatCardHeader,
  MatCardTitleGroup,
  MatCardTitle: matNativeElementComponentFactory('mat-card-title'),
  MatCardSubtitle: matNativeElementComponentFactory('mat-card-subtitle'),
  MatCardContent: matNativeElementComponentFactory('mat-card-content'),
  MatCardActions: matNativeElementComponentFactory('mat-card-actions'),
  MatCardFooter: matNativeElementComponentFactory('mat-card-footer'),
};

export const basicModules: Record<string, Type<any>> = {};
