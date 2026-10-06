import {
  MatFooterRowDef,
  MatHeaderRowDef,
  MatRowDef,
} from '@angular/material/table';

/**
 * 原因：动态渲染会抛错。
 * 官方假设：静态模板里 CDK 会创建 `_columnsDiffer`。
 * schema 时序：绑定 `matHeaderRowDef` / `matRowDefColumns` 时可能从未 create differ，
 * `_renderUpdatedColumns` 调 `getColumnsDiff` → `_columnsDiffer.diff` 空引用。
 * 只挂本子类 prototype，不改 CDK prototype。
 */

type RowDefDifferHost = {
  columns?: unknown;
  _columnsDiffer?: { diff: (value: unknown) => unknown };
  _differs?: { find: (value: unknown) => { create: () => { diff: (value: unknown) => unknown } } };
};

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

function getColumnsDiffSafe(this: RowDefDifferHost, original: () => unknown): unknown {
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
}

export class SchemaMatHeaderRowDef extends MatHeaderRowDef {}
export class SchemaMatRowDef<T = unknown> extends MatRowDef<T> {}
export class SchemaMatFooterRowDef extends MatFooterRowDef {}

(SchemaMatHeaderRowDef.prototype as any).getColumnsDiff = function (this: RowDefDifferHost) {
  return getColumnsDiffSafe.call(this, () => (MatHeaderRowDef.prototype as any).getColumnsDiff.call(this));
};
(SchemaMatRowDef.prototype as any).getColumnsDiff = function (this: RowDefDifferHost) {
  return getColumnsDiffSafe.call(this, () => (MatRowDef.prototype as any).getColumnsDiff.call(this));
};
(SchemaMatFooterRowDef.prototype as any).getColumnsDiff = function (this: RowDefDifferHost) {
  return getColumnsDiffSafe.call(this, () => (MatFooterRowDef.prototype as any).getColumnsDiff.call(this));
};
