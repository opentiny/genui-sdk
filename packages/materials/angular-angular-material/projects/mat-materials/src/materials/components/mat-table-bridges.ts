import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  Input,
  OnDestroy,
  OnInit,
  TemplateRef,
  ViewChild,
  ViewEncapsulation,
  inject,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { CdkTable } from '@angular/cdk/table';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatRow,
  MatRowDef,
} from '@angular/material/table';

/**
 * TODO: `*matColumnDef` / `*matHeaderCellDef` / `*matCellDef` / `*matHeaderRowDef` / `*matRowDef`
 * 是 Angular 结构指令，必须挂在 ng-template（或带 TemplateRef 的宿主）上；当前 schema 无法直接声明这些
 * 结构指令，故用本文件 bridge（组件内编译期模板 + addColumnDef / addHeaderRowDef / addRowDef）绕过。
 * 详见 docs/inner-docs/mat-table-structural-directives-todo.md
 */

/**
 * Schema 侧自定义列：在组件模板内声明 matColumnDef，并手动 addColumnDef。
 * 可选 ContentChild(TemplateRef)（schema NgTemplate）渲染单元格；否则按 name 读行字段。
 */
@Component({
  selector: 'mat-table-column',
  standalone: true,
  imports: [NgTemplateOutlet, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell],
  template: `
    <ng-container matColumnDef>
      <th mat-header-cell *matHeaderCellDef>{{ headerText ?? name }}</th>
      <td mat-cell *matCellDef="let row">
        @if (cellTemplate) {
          <ng-container
            *ngTemplateOutlet="cellTemplate; context: { $implicit: row, row: row, rowItem: row }"
          />
        } @else {
          {{ dataAccessor ? dataAccessor(row, name) : row?.[name] }}
        }
      </td>
    </ng-container>
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.Default,
})
export class MatTableColumn implements OnInit, OnDestroy {
  private readonly table = inject(CdkTable, { optional: true });

  @Input({ required: true }) name!: string;
  @Input() headerText?: string;
  @Input() dataAccessor?: (data: unknown, name: string) => unknown;

  @ContentChild(TemplateRef) cellTemplate?: TemplateRef<unknown>;

  @ViewChild(MatColumnDef, { static: true }) columnDef!: MatColumnDef;
  @ViewChild(MatCellDef, { static: true }) cell!: MatCellDef;
  @ViewChild(MatHeaderCellDef, { static: true }) headerCell!: MatHeaderCellDef;

  ngOnInit(): void {
    this.columnDef.name = this.name;
    this.columnDef.cell = this.cell;
    this.columnDef.headerCell = this.headerCell;
    this.table?.addColumnDef(this.columnDef);
  }

  ngOnDestroy(): void {
    this.table?.removeColumnDef(this.columnDef);
  }
}

/** Schema 侧表头行定义（绕过 *matHeaderRowDef 结构指令）。 */
@Component({
  selector: 'mat-table-header-row',
  standalone: true,
  imports: [MatHeaderRowDef, MatHeaderRow],
  template: `
    <ng-template matHeaderRowDef [matHeaderRowDef]="columns">
      <tr mat-header-row></tr>
    </ng-template>
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.Default,
})
export class MatTableHeaderRow implements OnInit, OnDestroy {
  private readonly table = inject(CdkTable, { optional: true });

  @Input() columns: string[] = [];

  @ViewChild(MatHeaderRowDef, { static: true }) headerRowDef!: MatHeaderRowDef;

  ngOnInit(): void {
    this.table?.addHeaderRowDef(this.headerRowDef);
  }

  ngOnDestroy(): void {
    this.table?.removeHeaderRowDef(this.headerRowDef);
  }
}

/** Schema 侧数据行定义（绕过 *matRowDef 结构指令）。 */
@Component({
  selector: 'mat-table-data-row',
  standalone: true,
  imports: [MatRowDef, MatRow],
  template: `
    <ng-template matRowDef [matRowDefColumns]="columns" let-row>
      <tr mat-row></tr>
    </ng-template>
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.Default,
})
export class MatTableDataRow implements OnInit, OnDestroy {
  private readonly table = inject(CdkTable, { optional: true });

  @Input() columns: string[] = [];

  @ViewChild(MatRowDef, { static: true }) rowDef!: MatRowDef<unknown>;

  ngOnInit(): void {
    this.table?.addRowDef(this.rowDef);
  }

  ngOnDestroy(): void {
    this.table?.removeRowDef(this.rowDef);
  }
}
