import { CdkCellOutlet, CdkFooterRowDef, CdkHeaderRowDef, CdkRowDef, CdkTextColumn } from '@angular/cdk/table';
import { ɵgetDirectives, type EmbeddedViewRef, type ViewContainerRef } from '@angular/core';
import { MatTable } from '@angular/material/table';

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
  _renderRow: (
    outlet: { viewContainer: ViewContainerRef },
    rowDef: { template: unknown },
    index: number,
    context?: object,
  ) => EmbeddedViewRef<object>;
  _renderCellTemplateForItem: (rowDef: unknown, context: object) => void;
  _getCellTemplates: (rowDef: unknown) => unknown[];
  _getRenderedRows: (rowOutlet: { viewContainer: ViewContainerRef }) => HTMLElement[];
  _headerRowOutlet?: { viewContainer: ViewContainerRef };
  _rowOutlet?: { viewContainer: ViewContainerRef };
  _changeDetectorRef: { markForCheck: () => void };
};

type RowDefDifferHost = {
  columns?: unknown;
  _columnsDiffer?: { diff: (value: unknown) => unknown };
  _differs?: { find: (value: unknown) => { create: () => { diff: (value: unknown) => unknown } } };
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

let patched = false;

function isRowHostElement(node: Node | null | undefined): node is HTMLElement {
  return !!node && node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).matches(ROW_HOST_SELECTOR);
}

/** Schema NgTemplate makes `rootNodes[0]` a comment; StickyStyler needs the real row host. */
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

/** `displayedColumns` is complete early; only stamp column defs that already have templates. */
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

/**
 * Schema binds `matHeaderRowDef` / `matRowDefColumns`, so CDK never creates
 * `_columnsDiffer` and `_renderUpdatedColumns` crashes on `.diff()`.
 */
function patchRowDefColumnsDiffer(): void {
  for (const ctor of [CdkHeaderRowDef, CdkRowDef, CdkFooterRowDef]) {
    let proto: { getColumnsDiff?: () => unknown } | null = ctor.prototype;
    for (let depth = 0; proto && depth < 6; depth++) {
      if (typeof proto.getColumnsDiff === 'function') {
        wrapGetColumnsDiff(proto);
        break;
      }
      proto = Object.getPrototypeOf(proto);
    }
  }
}

function wrapGetColumnsDiff(proto: { getColumnsDiff?: () => unknown }): void {
  const original = proto.getColumnsDiff;
  if (typeof original !== 'function' || (original as { __genuiPatched?: boolean }).__genuiPatched) {
    return;
  }
  const patchedFn = function patchedGetColumnsDiff(this: RowDefDifferHost) {
    this.columns = coerceColumnList(this.columns);
    if (!this._columnsDiffer && this._differs) {
      this._columnsDiffer = this._differs.find(this.columns).create();
      this._columnsDiffer.diff(this.columns);
      return null;
    }
    if (!this._columnsDiffer) {
      return null;
    }
    return original.call(this);
  };
  (patchedFn as { __genuiPatched?: boolean }).__genuiPatched = true;
  proto.getColumnsDiff = patchedFn;
}

/** Schema binds `name` after ngOnInit; CDK default header does `name[0].toUpperCase()`. */
function patchTextColumnDefaultHeader(): void {
  const proto = CdkTextColumn.prototype as {
    _createDefaultHeaderText?: () => string;
    name?: string;
  };
  const original = proto._createDefaultHeaderText;
  if (typeof original !== 'function' || (original as { __genuiPatched?: boolean }).__genuiPatched) {
    return;
  }
  const patchedFn = function patchedCreateDefaultHeaderText(this: { name?: string }) {
    if (this.name == null || this.name === '') {
      return '';
    }
    return original.call(this);
  };
  (patchedFn as { __genuiPatched?: boolean }).__genuiPatched = true;
  proto._createDefaultHeaderText = patchedFn;
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

/** Outlet sits on the row's inner ng-container (often a comment), not the `tr`. */
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

/**
 * Stamp into this row only. Do not use {@link CdkCellOutlet.mostRecentCellOutlet}
 * (process-wide; a second table would append into the first).
 */
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

/**
 * Schema children land after MatTable's first `_render` (skip empty defs).
 * NgTemplate does not sync-construct MatHeaderRow/CdkCellOutlet — detectChanges
 * the row, then stamp cells into that row's outlet.
 */
export function patchMatTableDeferredRender(): void {
  if (patched) {
    return;
  }
  patched = true;
  patchRowDefColumnsDiffer();
  patchTextColumnDefaultHeader();

  const proto = MatTable.prototype as unknown as MatTableRenderHost & {
    [READY_COLUMNS_KEY]?: string;
  };
  const originalRender = proto._render;
  if (typeof originalRender !== 'function') {
    return;
  }

  proto._render = function patchedRender(this: typeof proto) {
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
    return originalRender.call(this);
  };

  proto._renderRow = function patchedRenderRow(
    this: MatTableRenderHost,
    outlet: { viewContainer: ViewContainerRef },
    rowDef: { template: unknown },
    index: number,
    context: object = {},
  ) {
    const view = outlet.viewContainer.createEmbeddedView(rowDef.template as never, context, index);
    view.detectChanges();
    stampCellsIntoOutlet(this, rowDef, context, cellOutletForRowView(view));
    return view;
  };

  proto._renderCellTemplateForItem = function patchedRenderCells(
    this: MatTableRenderHost,
    rowDef: unknown,
    context: object,
  ) {
    const vc = this._rowOutlet?.viewContainer;
    const view = vc?.length
      ? (vc.get(vc.length - 1) as EmbeddedViewRef<object> | null)
      : null;
    view?.detectChanges();
    stampCellsIntoOutlet(this, rowDef, context, cellOutletForRowView(view));
  };

  proto._getRenderedRows = function patchedGetRenderedRows(
    this: MatTableRenderHost,
    rowOutlet: { viewContainer: ViewContainerRef },
  ) {
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
}
