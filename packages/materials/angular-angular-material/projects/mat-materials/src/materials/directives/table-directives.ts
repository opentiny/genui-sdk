import { Type } from '@angular/core';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatFooterCell,
  MatFooterCellDef,
  MatFooterRowDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRowDef,
  MatNoDataRow,
  MatRowDef,
} from '@angular/material/table';
import type { AutoApplyDirectivePattern } from '../types';

/**
 * MatColumnDef only declares `name` in ɵdir.inputs; sticky / stickyEnd live on
 * CdkColumnDef and are not always merged for schema `inputBinding` / template props.
 * Match whatever shape `ɵdir.inputs` already uses after Angular declare/link.
 */
function exposeMatColumnDefStickyInputs(): void {
  const dir = (MatColumnDef as Type<unknown> & { ɵdir?: { inputs?: Record<string, unknown> } })
    .ɵdir;
  if (!dir?.inputs) {
    return;
  }
  const inputs = dir.inputs;
  const sample = Object.values(inputs)[0];
  const asPublicMap = typeof sample === 'string';
  if (!('sticky' in inputs)) {
    inputs['sticky'] = asPublicMap ? 'sticky' : ['sticky', 'sticky'];
  }
  if (!('stickyEnd' in inputs)) {
    inputs['stickyEnd'] = asPublicMap ? 'stickyEnd' : ['stickyEnd', 'stickyEnd'];
  }
}

exposeMatColumnDefStickyInputs();

/** base：MatTable 结构指令 */
export const tableDirectives: Record<string, Type<any>> = {
  matColumnDef: MatColumnDef,
  matHeaderCellDef: MatHeaderCellDef,
  matCellDef: MatCellDef,
  matFooterCellDef: MatFooterCellDef,
  matHeaderRowDef: MatHeaderRowDef,
  matRowDef: MatRowDef,
  matFooterRowDef: MatFooterRowDef,
  matNoDataRow: MatNoDataRow,
  matHeaderCell: MatHeaderCell,
  matCell: MatCell,
  matFooterCell: MatFooterCell,
};

(MatColumnDef['ɵdir'] as any).standalone = true;
(MatHeaderCellDef['ɵdir'] as any).standalone = true;
(MatCellDef['ɵdir'] as any).standalone = true;
(MatFooterCellDef['ɵdir'] as any).standalone = true;
(MatHeaderRowDef['ɵdir'] as any).standalone = true;
(MatRowDef['ɵdir'] as any).standalone = true;
(MatFooterRowDef['ɵdir'] as any).standalone = true;
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
