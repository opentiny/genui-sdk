import { MatTextColumn } from '@angular/material/table';

/**
 * 原因：动态渲染会抛错。
 * 官方假设：ngOnInit 时 `name` 已绑定，`_createDefaultHeaderText` 做 `name[0].toUpperCase()`。
 * schema 时序：`name` 在 ngOnInit 之后才绑上，空 name 直接 throw。
 * 只挂本子类 prototype，不改 CdkTextColumn / MatTextColumn.prototype。
 */
export class SchemaMatTextColumn<T = unknown> extends MatTextColumn<T> {}

const officialCreateHeader = (MatTextColumn.prototype as any)._createDefaultHeaderText;
(SchemaMatTextColumn.prototype as any)._createDefaultHeaderText = function (this: { name?: string }): string {
  if (this.name == null || this.name === '') {
    return '';
  }
  return officialCreateHeader.call(this);
};
