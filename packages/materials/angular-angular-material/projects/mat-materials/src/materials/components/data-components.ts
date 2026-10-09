import { Type } from '@angular/core';
import {
  MatChip,
  MatChipGrid,
  MatChipListbox,
  MatChipOption,
  MatChipRow,
  MatChipSet,
} from '@angular/material/chips';
import { MatPaginator } from '@angular/material/paginator';
import { MatSortHeader } from '@angular/material/sort';
import { MatTree, MatTreeNode } from '@angular/material/tree';
import { matNativeElementComponentFactory } from '../native-element';

/** pro：碎片 / Paginator / Sort / Tree（Table 在 base `table-components`） */
export const dataComponents: Record<string, Type<any>> = {
  MatChipSet,
  MatChip,
  MatChipListbox,
  MatChipOption,
  MatChipGrid,
  MatChipRow,
  MatPaginator,
  MatSortHeader,
  MatTree,
  MatTreeNode: matNativeElementComponentFactory('mat-tree-node'),
};

export const dataModules: Record<string, Type<any>> = {};
