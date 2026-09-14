import { Type } from '@angular/core';
import {
  MatFooterRow,
  MatHeaderRow,
  MatRow,
  MatTable,
  MatTextColumn,
} from '@angular/material/table';
import {
  matNativeElementComponentFactory,
  preferNativeHtmlTableHost,
} from '../native-element';

/**
 * base：MatTable。官方组件（首帧空 row-def 由 runtime-patch 延迟）；列/行用官方结构指令 + MatTextColumn。
 * 宿主优先原生 `table`/`tr`，以便 `th`/`td`（含 MatTextColumn）走 table-cell 布局。
 *
 * Schema `ng-container` + `matColumnDef`：Angular 真 `ng-container` 是注释节点，不是元素。
 * 渲染器只能 `createComponent` 出元素宿主；在 native `MatTable` 客户端模板里默认没有
 * catch-all `ng-content`，列宿主通常不进 DOM，ContentChildren 仍能匹配，故一般无布局问题。
 */
export const tableComponents: Record<string, Type<any>> = {
  MatTable: preferNativeHtmlTableHost(MatTable),
  MatTextColumn,
  MatHeaderRow: preferNativeHtmlTableHost(MatHeaderRow),
  MatRow: preferNativeHtmlTableHost(MatRow),
  MatFooterRow: preferNativeHtmlTableHost(MatFooterRow),
  MatHeaderCell: matNativeElementComponentFactory('th'),
  MatCell: matNativeElementComponentFactory('td'),
  MatFooterCell: matNativeElementComponentFactory('td'),
  /** Logical column host (see file comment); not Angular's compile-time ng-container. */
  'ng-container': matNativeElementComponentFactory('ng-container'),
};

export const tableModules: Record<string, Type<any>> = {};
