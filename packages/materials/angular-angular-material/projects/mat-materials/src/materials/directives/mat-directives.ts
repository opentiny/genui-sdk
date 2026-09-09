import { Directive, inject, Type } from '@angular/core';
import { MatInput } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';
import { MatBadge } from '@angular/material/badge';
import { MatLabel } from '@angular/material/form-field';
import { MatCardActions, MatCardContent, MatCardSubtitle, MatCardTitle } from '@angular/material/card';
import { MatExpansionPanel, MatExpansionPanelTitle } from '@angular/material/expansion';
import { MatRadioGroup } from '@angular/material/radio';
import { MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatSliderRangeThumb, MatSliderThumb } from '@angular/material/slider';
import type { AutoApplyDirectivePattern } from '../materials';

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

export const directives: Record<string, Type<any>> = {
  matInput: MatInput,
  matTooltip: MatTooltip,
  matBadge: MatBadge,
  matLabel: MatLabel,
  matCardTitle: MatCardTitle,
  matCardSubtitle: MatCardSubtitle,
  matCardContent: MatCardContent,
  matCardActions: MatCardActions,
  matExpansionPanelTitle: MatExpansionPanelTitle,
  matExpansionPanelParent: MatExpansionPanelParentBridge,
  matRadioGroup: MatRadioGroup,
  matButtonToggleGroup: MatButtonToggleGroup,
  matSliderThumb: MatSliderThumb,
  matSliderStartThumb: MatSliderRangeThumb,
  matSliderEndThumb: MatSliderRangeThumb,
};

// 这些 Material 子结构指令需挂到渲染器动态创建的元素组件宿主上，
// 与渲染器内置 ngModel 等指令一样显式声明 standalone。
(MatLabel['ɵdir'] as any).standalone = true;
(MatCardTitle['ɵdir'] as any).standalone = true;
(MatCardSubtitle['ɵdir'] as any).standalone = true;
(MatCardContent['ɵdir'] as any).standalone = true;
(MatCardActions['ɵdir'] as any).standalone = true;
(MatExpansionPanelTitle['ɵdir'] as any).standalone = true;
(MatRadioGroup['ɵdir'] as any).standalone = true;
(MatButtonToggleGroup['ɵdir'] as any).standalone = true;

export const autoApplyDirectives: AutoApplyDirectivePattern = {
  // 原生 input/textarea 元素声明 matInput: true 时自动挂载 MatInput 指令，
  // 使输入框能作为 MatFormField 的控件工作
  matInput: (schema: any) => schema?.props?.matInput === true,
  matSliderThumb: (schema: any) => schema?.props?.matSliderThumb === true,
  matSliderStartThumb: (schema: any) => schema?.props?.matSliderStartThumb === true,
  matSliderEndThumb: (schema: any) => schema?.props?.matSliderEndThumb === true,
  // directive 类组件（MatLabel 等）作为独立节点渲染时，自动把对应指令挂到宿主元素上。
  // 兼容 PascalCase 类名（MatLabel）与 kebab-case 标签名（mat-label）两种 schema 写法。
  matLabel: (schema: any) => schema?.componentName === 'MatLabel' || schema?.componentName === 'mat-label',
  matCardTitle: (schema: any) => schema?.componentName === 'MatCardTitle' || schema?.componentName === 'mat-card-title',
  matCardSubtitle: (schema: any) => schema?.componentName === 'MatCardSubtitle' || schema?.componentName === 'mat-card-subtitle',
  matCardContent: (schema: any) => schema?.componentName === 'MatCardContent' || schema?.componentName === 'mat-card-content',
  matCardActions: (schema: any) => schema?.componentName === 'MatCardActions' || schema?.componentName === 'mat-card-actions',
  matExpansionPanelTitle: (schema: any) =>
    schema?.componentName === 'MatExpansionPanelTitle' || schema?.componentName === 'mat-panel-title',
  matExpansionPanelParent: (schema: any) =>
    schema?.componentName === 'MatExpansionPanelHeader' || schema?.componentName === 'mat-expansion-panel-header',
  matRadioGroup: (schema: any) =>
    schema?.componentName === 'MatRadioGroup' || schema?.componentName === 'mat-radio-group',
  matButtonToggleGroup: (schema: any) =>
    schema?.componentName === 'MatButtonToggleGroup' || schema?.componentName === 'mat-button-toggle-group',
  matTooltip: (schema: any) => schema?.props?.matTooltip !== undefined && schema?.props?.matTooltip !== false,
  matBadge: (schema: any) => schema?.props?.matBadge !== undefined && schema?.props?.matBadge !== false,
};
