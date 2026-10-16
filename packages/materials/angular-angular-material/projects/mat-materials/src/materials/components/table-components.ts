import '../../schema-adapt/register-schema-types';
import { Type } from '@angular/core';
import { SchemaMatTextColumn } from '../../schema-adapt/dynamic-crash/schema-mat-text-column';
import {
  SchemaMatFooterRow,
  SchemaMatHeaderRow,
  SchemaMatRow,
  SchemaMatTable,
} from '../../schema-adapt/dynamic-timing/schema-mat-table';
import {
  matNativeElementComponentFactory,
  preferNativeHtmlTableHost,
} from '../native-element';

/**
 * base：SchemaMatTable（动态列/行 stamp）。列/行结构指令 + SchemaMatTextColumn。
 * 宿主优先原生 `table`/`tr`（只改 schema 子类 ɵcmp 副本）。
 */
export const tableComponents: Record<string, Type<any>> = {
  MatTable: preferNativeHtmlTableHost(SchemaMatTable),
  MatTextColumn: SchemaMatTextColumn,
  MatHeaderRow: preferNativeHtmlTableHost(SchemaMatHeaderRow),
  MatRow: preferNativeHtmlTableHost(SchemaMatRow),
  MatFooterRow: preferNativeHtmlTableHost(SchemaMatFooterRow),
  MatHeaderCell: matNativeElementComponentFactory('th'),
  MatCell: matNativeElementComponentFactory('td'),
  MatFooterCell: matNativeElementComponentFactory('td'),
  /** Logical column host (see file comment); not Angular's compile-time ng-container. */
  'ng-container': matNativeElementComponentFactory('ng-container'),
};

export const tableModules: Record<string, Type<any>> = {};
