import { CdkCellOutlet } from '@angular/cdk/table';
import { ɵgetDirectives, type EmbeddedViewRef, type ViewContainerRef } from '@angular/core';
import {
  MatFooterRow,
  MatHeaderRow,
  MatRow,
  MatTable,
} from '@angular/material/table';

/**
 * 原因 B：动态渲染不抛错但行为错。
 * 官方假设：首次 `_render` 时 row/column def 已在；row view `rootNodes[0]` 是行宿主；
 * 单元格 stamp 用 process-wide `CdkCellOutlet.mostRecentCellOutlet`。
 * schema 时序：子节点晚到，首帧 defs 为空；NgTemplate 根是 comment；多表会串 outlet。
 *
 * 私有方法只挂在本子类 prototype 上，不改 MatTable.prototype。
 *
 * 原因 E：原生 table 布局。preferNativeHtmlTableHost 只改这些子类的 ɵcmp 副本。
 */
type CellOutletHost = { _viewContainer: ViewContainerRef };

type ColumnDefLike = {
  headerCell?: { template?: unknown };
  cell?: { template?: unknown };
};

type MatTableRenderHost = {
  _render: () => void;
  _cacheRowDefs: () => void;
  _cacheColumnDefs: () => void;
  _columnDefsByName?: { forEach: (fn: (col: ColumnDefLike, id: string) => void) => void };
  _headerRowDefs: unknown[];
  _footerRowDefs: unknown[];
  _rowDefs: unknown[];
  _headerRowDefChanged?: boolean;
  _getCellTemplates: (rowDef: unknown) => unknown[];
  _headerRowOutlet?: { viewContainer: ViewContainerRef };
  _rowOutlet?: { viewContainer: ViewContainerRef };
  _changeDetectorRef: { markForCheck: () => void };
};

type RowDefDifferHost = {
  columns?: unknown;
  _columnsDiffer?: { diff: (value: unknown) => unknown };
};

const DECLARED_COLUMNS = Symbol('genuiDeclaredColumns');
const READY_COLUMNS_KEY = Symbol('genuiReadyColumnsKey');
const ROW_HOST_SELECTOR = [
  'tr[mat-header-row]',
  'tr[mat-row]',
  'tr[mat-footer-row]',
  'mat-header-row',
  'mat-row',
  'mat-footer-row',
  'tr.mat-mdc-header-row',
  'tr.mat-mdc-row',
  'tr.mat-mdc-footer-row',
].join(',');

function isRowHostElement(node: Node | null | undefined): node is HTMLElement {
  return !!node && node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).matches(ROW_HOST_SELECTOR);
}

function findRenderedRowElement(viewRef: EmbeddedViewRef<object>): HTMLElement | null {
  for (const node of viewRef.rootNodes) {
    if (isRowHostElement(node)) {
      return node;
    }
    if (node?.nodeType === Node.ELEMENT_NODE) {
      const nested = (node as HTMLElement).querySelector(ROW_HOST_SELECTOR);
      if (nested) {
        return nested as HTMLElement;
      }
    }
  }
  const parent = viewRef.rootNodes.find((n) => n?.parentNode)?.parentNode;
  if (parent) {
    for (const child of Array.from(parent.childNodes) as Node[]) {
      if (isRowHostElement(child)) {
        return child;
      }
    }
  }
  return null;
}

function coerceColumnList(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (value == null || value === '') {
    return [];
  }
  if (typeof value === 'string') {
    return value.split(/[\s,]+/).filter(Boolean);
  }
  return [];
}

function readyColumnIds(table: MatTableRenderHost): string[] {
  const ids: string[] = [];
  table._columnDefsByName?.forEach((col, id) => {
    if (col?.headerCell?.template && col?.cell?.template) {
      ids.push(String(id));
    }
  });
  return ids;
}

function syncRowDefColumns(rowDef: unknown, readyIds: string[], resetDiffer: boolean): void {
  const def = rowDef as RowDefDifferHost & { [DECLARED_COLUMNS]?: unknown[] };
  def[DECLARED_COLUMNS] ??= coerceColumnList(def.columns);
  const declared = def[DECLARED_COLUMNS] ?? [];
  const readySet = new Set(readyIds);
  def.columns = (declared.length ? declared.map(String) : readyIds).filter((id) => readySet.has(id));
  if (resetDiffer) {
    def._columnsDiffer = undefined;
  }
}

function findCdkCellOutletOnNode(node: Node | null | undefined): CdkCellOutlet | null {
  if (!node) {
    return null;
  }
  try {
    for (const dir of ɵgetDirectives(node as Element) ?? []) {
      if (dir instanceof CdkCellOutlet) {
        return dir;
      }
    }
  } catch {
    // Comment / text nodes throw.
  }
  return null;
}

function cellOutletForRowView(view: EmbeddedViewRef<object> | null | undefined): CellOutletHost | null {
  if (!view) {
    return null;
  }
  const rowEl = findRenderedRowElement(view);
  const fromRow = findCdkCellOutletOnNode(rowEl)
    ?? (rowEl
      ? Array.from(rowEl.childNodes)
          .map((node) => findCdkCellOutletOnNode(node))
          .find((dir): dir is CdkCellOutlet => !!dir)
      : null);
  if (fromRow) {
    return fromRow as unknown as CellOutletHost;
  }
  for (const node of view.rootNodes) {
    const fromRoot = findCdkCellOutletOnNode(node);
    if (fromRoot) {
      return fromRoot as unknown as CellOutletHost;
    }
  }
  return null;
}

function stampCellsIntoOutlet(
  table: MatTableRenderHost,
  rowDef: unknown,
  context: object,
  cellOutlet: CellOutletHost | null,
): void {
  if (!cellOutlet) {
    return;
  }
  let templates: unknown[];
  try {
    templates = table._getCellTemplates(rowDef) ?? [];
  } catch {
    return;
  }
  const vc = cellOutlet._viewContainer;
  if (vc.length === templates.length) {
    return;
  }
  vc.clear();
  for (const cellTemplate of templates) {
    const cellView = vc.createEmbeddedView(cellTemplate as never, context);
    cellView.detectChanges();
  }
  table._changeDetectorRef.markForCheck();
}

function restampOutletRows(
  table: MatTableRenderHost,
  outlet: { viewContainer: ViewContainerRef } | undefined,
  rowDef: unknown,
): void {
  const vc = outlet?.viewContainer;
  if (!vc || !rowDef) {
    return;
  }
  for (let i = 0; i < vc.length; i++) {
    const view = vc.get(i) as EmbeddedViewRef<object> | null;
    if (view) {
      stampCellsIntoOutlet(table, rowDef, view.context as object, cellOutletForRowView(view));
    }
  }
}

export class SchemaMatTable<T = unknown> extends MatTable<T> {}

const tableProto = SchemaMatTable.prototype as any;
const officialTable = MatTable.prototype as any;

tableProto._render = function (this: MatTableRenderHost & { [READY_COLUMNS_KEY]?: string }): void {
  this._cacheRowDefs();
  this._cacheColumnDefs();
  const ready = readyColumnIds(this);
  const readyKey = ready.join('\0');
  const columnsGrew = !!this[READY_COLUMNS_KEY] && this[READY_COLUMNS_KEY] !== readyKey;
  this[READY_COLUMNS_KEY] = readyKey;
  const allRowDefs = [
    ...(this._headerRowDefs ?? []),
    ...(this._rowDefs ?? []),
    ...(this._footerRowDefs ?? []),
  ];
  for (const def of allRowDefs) {
    syncRowDefColumns(def, ready, columnsGrew);
  }
  if (!allRowDefs.length) {
    return;
  }
  if (columnsGrew) {
    this._headerRowDefChanged = false;
    restampOutletRows(this, this._headerRowOutlet, this._headerRowDefs[0]);
    restampOutletRows(this, this._rowOutlet, this._rowDefs[0]);
  }
  officialTable._render.call(this);
};

tableProto._renderRow = function (
  this: unknown,
  outlet: { viewContainer: ViewContainerRef },
  rowDef: { template: unknown },
  index: number,
  context: object = {},
): EmbeddedViewRef<object> {
  const view = outlet.viewContainer.createEmbeddedView(rowDef.template as never, context, index);
  view.detectChanges();
  stampCellsIntoOutlet(
    this as MatTableRenderHost,
    rowDef,
    context,
    cellOutletForRowView(view),
  );
  return view;
};

tableProto._renderCellTemplateForItem = function (this: MatTableRenderHost, rowDef: unknown, context: object): void {
  const vc = this._rowOutlet?.viewContainer;
  const view = vc?.length
    ? (vc.get(vc.length - 1) as EmbeddedViewRef<object> | null)
    : null;
  view?.detectChanges();
  stampCellsIntoOutlet(this, rowDef, context, cellOutletForRowView(view));
};

tableProto._getRenderedRows = function (
  this: unknown,
  rowOutlet: { viewContainer: ViewContainerRef },
): HTMLElement[] {
  const renderedRows: HTMLElement[] = [];
  const vc = rowOutlet.viewContainer;
  for (let i = 0; i < vc.length; i++) {
    const viewRef = vc.get(i) as EmbeddedViewRef<object> | null;
    const rowEl = viewRef && findRenderedRowElement(viewRef);
    if (rowEl) {
      renderedRows.push(rowEl);
    }
  }
  return renderedRows;
};

export class SchemaMatHeaderRow extends MatHeaderRow {}
export class SchemaMatRow extends MatRow {}
export class SchemaMatFooterRow extends MatFooterRow {}
