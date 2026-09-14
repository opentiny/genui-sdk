import { CdkCellOutlet } from '@angular/cdk/table';
import { MatTable } from '@angular/material/table';
import type { EmbeddedViewRef, ViewContainerRef } from '@angular/core';

type CellOutletHost = { _viewContainer: ViewContainerRef };

type MatTableRenderHost = {
  _render: () => void;
  _cacheRowDefs: () => void;
  _cacheColumnDefs: () => void;
  _headerRowDefs: unknown[];
  _footerRowDefs: unknown[];
  _rowDefs: unknown[];
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
  _footerRowOutlet?: { viewContainer: ViewContainerRef };
  _rowOutlet?: { viewContainer: ViewContainerRef };
  _changeDetectorRef: { markForCheck: () => void };
};

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
  if (!node || node.nodeType !== Node.ELEMENT_NODE) {
    return false;
  }
  const el = node as HTMLElement;
  const tag = el.tagName;
  return (
    tag === 'TR'
    || tag === 'MAT-HEADER-ROW'
    || tag === 'MAT-ROW'
    || tag === 'MAT-FOOTER-ROW'
    || el.hasAttribute('mat-header-row')
    || el.hasAttribute('mat-row')
    || el.hasAttribute('mat-footer-row')
  );
}

/**
 * Schema row templates wrap `MatHeaderRow`/`MatRow` in `ngTemplateOutlet`, so
 * `viewRef.rootNodes[0]` is often a comment — StickyStyler then crashes on
 * `row.children.length`. Resolve the real row host inside the embedded view.
 */
function findRenderedRowElement(viewRef: EmbeddedViewRef<object>): HTMLElement | null {
  for (const node of viewRef.rootNodes) {
    if (isRowHostElement(node)) {
      return node;
    }
    if (node?.nodeType === Node.ELEMENT_NODE) {
      const nested = (node as HTMLElement).querySelector?.(ROW_HOST_SELECTOR);
      if (nested) {
        return nested as HTMLElement;
      }
    }
  }
  // Outlet may leave the row as a sibling of comment anchors under the same parent.
  const anchor = viewRef.rootNodes.find((n) => n?.parentNode) ?? null;
  const parent = anchor?.parentNode;
  if (parent) {
    for (const child of Array.from(parent.childNodes) as Node[]) {
      if (isRowHostElement(child)) {
        return child;
      }
    }
  }
  return null;
}

let patched = false;

function detectChangesView(vc: ViewContainerRef | undefined, index = -1): void {
  if (!vc?.length) {
    return;
  }
  const i = index < 0 ? vc.length - 1 : index;
  const view = vc.get(i) as EmbeddedViewRef<object> | null;
  view?.detectChanges();
}

/**
 * Stamp cell templates into the current {@link CdkCellOutlet.mostRecentCellOutlet}.
 * Schema cell templates also wrap content in `ngTemplateOutlet`, so each cell view
 * needs detectChanges for `th`/`td` hosts to appear.
 */
function stampCellsIntoMostRecentOutlet(
  table: MatTableRenderHost,
  rowDef: unknown,
  context: object,
): void {
  const cellOutlet = CdkCellOutlet.mostRecentCellOutlet as CellOutletHost | null;
  if (!cellOutlet) {
    return;
  }
  for (const cellTemplate of table._getCellTemplates(rowDef)) {
    const cellView = cellOutlet._viewContainer.createEmbeddedView(
      cellTemplate as never,
      context,
    );
    cellView.detectChanges();
  }
  table._changeDetectorRef.markForCheck();
}

/**
 * Schema children (row/column defs) are created after the MatTable outlet is ready.
 * Native MatTable throws "Missing definitions for header, footer, and row" on that
 * first empty `_render`. Skip until ContentChildren patch fills the defs.
 *
 * Schema `NgTemplate` wraps row/cell hosts in `ngTemplateOutlet`, so
 * `createEmbeddedView(rowDef.template)` does not synchronously construct
 * `MatHeaderRow`/`MatRow`/`CdkCellOutlet`. We detectChanges the new row view first.
 *
 * Critical: data rows go through the viewRepeater → `_renderCellTemplateForItem`
 * without `_renderRow`. After the header was stamped, `mostRecentCellOutlet` still
 * points at the header; without CD on the new data row, every data cell is stamped
 * into the header (everything looks "projected" into one horizontal strip).
 *
 * Patch the real MatTable prototype so we keep Material's providers / DI intact.
 */
export function patchMatTableDeferredRender(): void {
  if (patched) {
    return;
  }
  patched = true;

  const proto = MatTable.prototype as unknown as MatTableRenderHost;
  const originalRender = proto._render;
  if (typeof originalRender !== 'function') {
    return;
  }

  proto._render = function patchedRender(this: MatTableRenderHost) {
    this._cacheRowDefs();
    this._cacheColumnDefs();
    if (
      !this._headerRowDefs.length &&
      !this._footerRowDefs.length &&
      !this._rowDefs.length
    ) {
      return;
    }
    return originalRender.call(this);
  };

  // Header / footer rows (and any path that uses _renderRow).
  proto._renderRow = function patchedRenderRow(
    this: MatTableRenderHost,
    outlet: { viewContainer: ViewContainerRef },
    rowDef: { template: unknown },
    index: number,
    context: object = {},
  ) {
    const view = outlet.viewContainer.createEmbeddedView(
      rowDef.template as never,
      context,
      index,
    );
    // Construct MatHeaderRow/MatRow + CdkCellOutlet inside schema NgTemplate.
    view.detectChanges();
    stampCellsIntoMostRecentOutlet(this, rowDef, context);
    return view;
  };

  // Data rows: viewRepeater inserts the row view, then calls this (not _renderRow).
  proto._renderCellTemplateForItem = function patchedRenderCells(
    this: MatTableRenderHost,
    rowDef: unknown,
    context: object,
  ) {
    // Must CD the newest data-row view so its CdkCellOutlet replaces the header's
    // stale mostRecentCellOutlet before we stamp cells.
    detectChangesView(this._rowOutlet?.viewContainer);
    stampCellsIntoMostRecentOutlet(this, rowDef, context);
  };

  proto._getRenderedRows = function patchedGetRenderedRows(
    this: MatTableRenderHost,
    rowOutlet: { viewContainer: ViewContainerRef },
  ) {
    const renderedRows: HTMLElement[] = [];
    const vc = rowOutlet.viewContainer;
    for (let i = 0; i < vc.length; i++) {
      const viewRef = vc.get(i) as EmbeddedViewRef<object> | null;
      if (!viewRef) {
        continue;
      }
      const rowEl = findRenderedRowElement(viewRef);
      if (rowEl) {
        renderedRows.push(rowEl);
      }
    }
    return renderedRows;
  };
}
