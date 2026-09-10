import { Directive, inject, Type } from '@angular/core';
import { MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatDatepickerInput } from '@angular/material/datepicker';
import {
  MatAccordion,
  MatExpansionPanel,
  MatExpansionPanelActionRow,
  MatExpansionPanelDescription,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';
import {
  MatListItemAvatar,
  MatListItemIcon,
  MatListItemLine,
  MatListItemMeta,
  MatListItemTitle,
} from '@angular/material/list';
import { MatStepperNext, MatStepperPrevious } from '@angular/material/stepper';
import { MatTimepickerInput } from '@angular/material/timepicker';
import type { AutoApplyDirectivePattern } from '../types';

/**
 * Host directive on MatExpansionPanelHeader.
 *
 * Header injects MatExpansionPanel with `{ host: true }`, which only sees providers on the
 * header host itself. Schema children are created before projection, so the panel is not
 * a DOM ancestor yet. This directive re-provides the panel from the parent injector onto
 * the header host so the `{ host: true }` lookup succeeds.
 */
@Directive({
  selector: '[matExpansionPanelParent]',
  standalone: true,
  providers: [
    {
      provide: MatExpansionPanel,
      useFactory: () => inject(MatExpansionPanel, { skipSelf: true }),
    },
  ],
})
export class MatExpansionPanelParentBridge {}

/** plus：布局 / Expansion Host bridge / 表单增强触发器 */
export const layoutDirectives: Record<string, Type<any>> = {
  matAccordion: MatAccordion,
  matExpansionPanelTitle: MatExpansionPanelTitle,
  matExpansionPanelDescription: MatExpansionPanelDescription,
  matExpansionPanelActionRow: MatExpansionPanelActionRow,
  matExpansionPanelParent: MatExpansionPanelParentBridge,
  matListItemAvatar: MatListItemAvatar,
  matListItemIcon: MatListItemIcon,
  matListItemTitle: MatListItemTitle,
  matListItemLine: MatListItemLine,
  matListItemMeta: MatListItemMeta,
  matAutocomplete: MatAutocompleteTrigger,
  matDatepicker: MatDatepickerInput,
  matTimepicker: MatTimepickerInput,
  matStepperNext: MatStepperNext,
  matStepperPrevious: MatStepperPrevious,
};

(MatAccordion['ɵdir'] as any).standalone = true;
(MatExpansionPanelTitle['ɵdir'] as any).standalone = true;
(MatExpansionPanelDescription['ɵdir'] as any).standalone = true;
(MatExpansionPanelActionRow['ɵdir'] as any).standalone = true;
(MatListItemAvatar['ɵdir'] as any).standalone = true;
(MatListItemIcon['ɵdir'] as any).standalone = true;
(MatListItemTitle['ɵdir'] as any).standalone = true;
(MatListItemLine['ɵdir'] as any).standalone = true;
(MatListItemMeta['ɵdir'] as any).standalone = true;

export const layoutAutoApplyDirectives: AutoApplyDirectivePattern = {
  matAccordion: (schema: any) =>
    schema?.componentName === 'MatAccordion' || schema?.componentName === 'mat-accordion',
  matExpansionPanelTitle: (schema: any) =>
    schema?.componentName === 'MatExpansionPanelTitle' || schema?.componentName === 'mat-panel-title',
  matExpansionPanelDescription: (schema: any) =>
    schema?.componentName === 'MatExpansionPanelDescription' ||
    schema?.componentName === 'mat-panel-description',
  matExpansionPanelActionRow: (schema: any) =>
    schema?.componentName === 'MatExpansionPanelActionRow' || schema?.componentName === 'mat-action-row',
  matExpansionPanelParent: (schema: any) =>
    schema?.componentName === 'MatExpansionPanelHeader' ||
    schema?.componentName === 'mat-expansion-panel-header',
  matListItemAvatar: (schema: any) => schema?.props?.matListItemAvatar === true,
  matListItemIcon: (schema: any) => schema?.props?.matListItemIcon === true,
  matListItemTitle: (schema: any) => schema?.props?.matListItemTitle === true,
  matListItemLine: (schema: any) => schema?.props?.matListItemLine === true,
  matListItemMeta: (schema: any) => schema?.props?.matListItemMeta === true,
  matAutocomplete: (schema: any) =>
    schema?.props?.matAutocomplete !== undefined && schema?.props?.matAutocomplete !== false,
  matDatepicker: (schema: any) =>
    schema?.props?.matDatepicker !== undefined && schema?.props?.matDatepicker !== false,
  matTimepicker: (schema: any) =>
    schema?.props?.matTimepicker !== undefined && schema?.props?.matTimepicker !== false,
  matStepperNext: (schema: any) => schema?.props?.matStepperNext === true,
  matStepperPrevious: (schema: any) => schema?.props?.matStepperPrevious === true,
};
