import { Type } from '@angular/core';
import { MatChipAvatar, MatChipInput, MatChipRemove } from '@angular/material/chips';
import { MatSort } from '@angular/material/sort';
import { MatTreeNode } from '@angular/material/tree';
import type { AutoApplyDirectivePattern } from '../types';

/** pro：碎片 / 排序 / 树节点相关指令 */
export const dataDirectives: Record<string, Type<any>> = {
  matChipRemove: MatChipRemove,
  matChipAvatar: MatChipAvatar,
  matChipInputFor: MatChipInput,
  matSort: MatSort,
  matTreeNode: MatTreeNode,
};

(MatChipRemove['ɵdir'] as any).standalone = true;
(MatChipAvatar['ɵdir'] as any).standalone = true;
(MatTreeNode['ɵdir'] as any).standalone = true;

export const dataAutoApplyDirectives: AutoApplyDirectivePattern = {
  matChipRemove: (schema: any) => schema?.props?.matChipRemove === true,
  matChipAvatar: (schema: any) => schema?.props?.matChipAvatar === true,
  matChipInputFor: (schema: any) =>
    schema?.props?.matChipInputFor !== undefined && schema?.props?.matChipInputFor !== false,
  matSort: (schema: any) => schema?.props?.matSort === true,
  matTreeNode: (schema: any) =>
    schema?.componentName === 'MatTreeNode' || schema?.componentName === 'mat-tree-node',
};
