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
import { MatTable, MatTextColumn } from '@angular/material/table';
import { MatTree, MatTreeNode } from '@angular/material/tree';
import { matNativeElementComponentFactory } from '../native-element';
import { MatTableColumn, MatTableDataRow, MatTableHeaderRow } from './mat-table-bridges';

/**
 * pro：数据展示。
 * MatTable 列/行结构指令无法直接写在 schema 里，用 MatTextColumn / MatTableColumn /
 * MatTableHeaderRow / MatTableDataRow bridge 补齐。
 */
export const dataComponents: Record<string, Type<any>> = {
  MatChipSet,
  MatChip,
  MatChipListbox,
  MatChipOption,
  MatChipGrid,
  MatChipRow,
  MatPaginator,
  MatTable,
  MatTextColumn,
  MatTableColumn,
  MatTableHeaderRow,
  MatTableDataRow,
  MatSortHeader,
  MatTree,
  MatTreeNode: matNativeElementComponentFactory('mat-tree-node'),
};

export const dataModules: Record<string, Type<any>> = {};
