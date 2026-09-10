import { Type } from '@angular/core';
import { MatBadge } from '@angular/material/badge';
import { MatButtonToggleGroup } from '@angular/material/button-toggle';
import {
  MatCardActions,
  MatCardAvatar,
  MatCardContent,
  MatCardFooter,
  MatCardImage,
  MatCardSubtitle,
  MatCardTitle,
} from '@angular/material/card';
import { MatError, MatHint, MatLabel, MatPrefix, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatRadioGroup } from '@angular/material/radio';
import { MatSliderRangeThumb, MatSliderThumb } from '@angular/material/slider';
import { MatTooltip } from '@angular/material/tooltip';
import type { AutoApplyDirectivePattern } from '../types';

/** base：表单 / Card / 通用指令 */
export const baseDirectives: Record<string, Type<any>> = {
  matInput: MatInput,
  matTooltip: MatTooltip,
  matBadge: MatBadge,
  matLabel: MatLabel,
  matHint: MatHint,
  matError: MatError,
  matPrefix: MatPrefix,
  matSuffix: MatSuffix,
  matCardTitle: MatCardTitle,
  matCardSubtitle: MatCardSubtitle,
  matCardContent: MatCardContent,
  matCardActions: MatCardActions,
  matCardFooter: MatCardFooter,
  matCardImage: MatCardImage,
  matCardAvatar: MatCardAvatar,
  matRadioGroup: MatRadioGroup,
  matButtonToggleGroup: MatButtonToggleGroup,
  matSliderThumb: MatSliderThumb,
  matSliderStartThumb: MatSliderRangeThumb,
  matSliderEndThumb: MatSliderRangeThumb,
};

(MatLabel['ɵdir'] as any).standalone = true;
(MatHint['ɵdir'] as any).standalone = true;
(MatError['ɵdir'] as any).standalone = true;
(MatPrefix['ɵdir'] as any).standalone = true;
(MatSuffix['ɵdir'] as any).standalone = true;
(MatCardTitle['ɵdir'] as any).standalone = true;
(MatCardSubtitle['ɵdir'] as any).standalone = true;
(MatCardContent['ɵdir'] as any).standalone = true;
(MatCardActions['ɵdir'] as any).standalone = true;
(MatCardFooter['ɵdir'] as any).standalone = true;
(MatCardImage['ɵdir'] as any).standalone = true;
(MatCardAvatar['ɵdir'] as any).standalone = true;
(MatRadioGroup['ɵdir'] as any).standalone = true;
(MatButtonToggleGroup['ɵdir'] as any).standalone = true;

export const baseAutoApplyDirectives: AutoApplyDirectivePattern = {
  matInput: (schema: any) => schema?.props?.matInput === true,
  matSliderThumb: (schema: any) => schema?.props?.matSliderThumb === true,
  matSliderStartThumb: (schema: any) => schema?.props?.matSliderStartThumb === true,
  matSliderEndThumb: (schema: any) => schema?.props?.matSliderEndThumb === true,
  matLabel: (schema: any) => schema?.componentName === 'MatLabel' || schema?.componentName === 'mat-label',
  matHint: (schema: any) => schema?.componentName === 'MatHint' || schema?.componentName === 'mat-hint',
  matError: (schema: any) => schema?.componentName === 'MatError' || schema?.componentName === 'mat-error',
  matPrefix: (schema: any) =>
    schema?.props?.matPrefix === true ||
    schema?.props?.matIconPrefix === true ||
    schema?.props?.matTextPrefix === true,
  matSuffix: (schema: any) =>
    schema?.props?.matSuffix === true ||
    schema?.props?.matIconSuffix === true ||
    schema?.props?.matTextSuffix === true,
  matCardTitle: (schema: any) => schema?.componentName === 'MatCardTitle' || schema?.componentName === 'mat-card-title',
  matCardSubtitle: (schema: any) =>
    schema?.componentName === 'MatCardSubtitle' || schema?.componentName === 'mat-card-subtitle',
  matCardContent: (schema: any) =>
    schema?.componentName === 'MatCardContent' || schema?.componentName === 'mat-card-content',
  matCardActions: (schema: any) =>
    schema?.componentName === 'MatCardActions' || schema?.componentName === 'mat-card-actions',
  matCardFooter: (schema: any) =>
    schema?.componentName === 'MatCardFooter' || schema?.componentName === 'mat-card-footer',
  matCardImage: (schema: any) =>
    schema?.props?.matCardImage === true || schema?.props?.['mat-card-image'] === true,
  matCardAvatar: (schema: any) =>
    schema?.props?.matCardAvatar === true || schema?.props?.['mat-card-avatar'] === true,
  matRadioGroup: (schema: any) =>
    schema?.componentName === 'MatRadioGroup' || schema?.componentName === 'mat-radio-group',
  matButtonToggleGroup: (schema: any) =>
    schema?.componentName === 'MatButtonToggleGroup' || schema?.componentName === 'mat-button-toggle-group',
  matTooltip: (schema: any) => schema?.props?.matTooltip !== undefined && schema?.props?.matTooltip !== false,
  matBadge: (schema: any) => schema?.props?.matBadge !== undefined && schema?.props?.matBadge !== false,
};
