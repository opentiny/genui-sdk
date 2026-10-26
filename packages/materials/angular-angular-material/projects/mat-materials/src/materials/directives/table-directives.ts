import '../../schema-adapt/register-schema-types';
import { Type } from '@angular/core';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatFooterCell,
  MatFooterCellDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatNoDataRow,
} from '@angular/material/table';
import {
  SchemaMatFooterRowDef,
  SchemaMatHeaderRowDef,
  SchemaMatRowDef,
} from '../../schema-adapt/dynamic-crash/schema-mat-row-defs';
import type { AutoApplyDirectivePattern } from '../types';

/** base：MatTable 结构指令 */
export const tableDirectives: Record<string, Type<any>> = {
  matColumnDef: MatColumnDef,
  matHeaderCellDef: MatHeaderCellDef,
  matCellDef: MatCellDef,
  matFooterCellDef: MatFooterCellDef,
  matHeaderRowDef: SchemaMatHeaderRowDef,
  matRowDef: SchemaMatRowDef,
  matFooterRowDef: SchemaMatFooterRowDef,
  matNoDataRow: MatNoDataRow,
  matHeaderCell: MatHeaderCell,
  matCell: MatCell,
  matFooterCell: MatFooterCell,
};

(MatColumnDef['ɵdir'] as any).standalone = true;
(MatHeaderCellDef['ɵdir'] as any).standalone = true;
(MatCellDef['ɵdir'] as any).standalone = true;
(MatFooterCellDef['ɵdir'] as any).standalone = true;
(SchemaMatHeaderRowDef['ɵdir'] as any).standalone = true;
(SchemaMatRowDef['ɵdir'] as any).standalone = true;
(SchemaMatFooterRowDef['ɵdir'] as any).standalone = true;
(MatNoDataRow['ɵdir'] as any).standalone = true;
(MatHeaderCell['ɵdir'] as any).standalone = true;
(MatCell['ɵdir'] as any).standalone = true;
(MatFooterCell['ɵdir'] as any).standalone = true;

export const tableAutoApplyDirectives: AutoApplyDirectivePattern = {
  matHeaderCell: (schema: any) =>
    schema?.props?.matHeaderCell === true
    || schema?.componentName === 'MatHeaderCell'
    || schema?.componentName === 'mat-header-cell',
  matCell: (schema: any) =>
    schema?.props?.matCell === true
    || schema?.componentName === 'MatCell'
    || schema?.componentName === 'mat-cell',
  matFooterCell: (schema: any) =>
    schema?.props?.matFooterCell === true
    || schema?.componentName === 'MatFooterCell'
    || schema?.componentName === 'mat-footer-cell',
};
