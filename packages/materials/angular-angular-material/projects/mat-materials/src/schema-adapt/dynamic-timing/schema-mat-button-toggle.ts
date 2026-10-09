import { Component } from '@angular/core';
import { MatButtonToggle } from '@angular/material/button-toggle';

/**
 * 原因：流式重建时官方 ngOnDestroy 会 `_syncButtonToggle(this, false)`，
 * 把还该选中的项从 selectionModel 摘掉，勾选 UI 会闪。
 * 组 value 仍指向本项时跳过这次 deselect。
 *
 * @Component 仅满足 NG2007；template/selector 由 adoptStandaloneType 换成官方 ɵcmp。
 */
@Component({
  selector: 'schema-mat-button-toggle',
  standalone: true,
  template: '',
})
export class SchemaMatButtonToggle extends MatButtonToggle {
  override ngOnDestroy(): void {
    const group = this.buttonToggleGroup as any;
    const raw = group?._rawValue !== undefined ? group._rawValue : group?._value;
    const stillWanted =
      group &&
      raw !== undefined &&
      raw !== null &&
      raw !== '' &&
      (group.multiple
        ? Array.isArray(raw) && raw.some((item: unknown) => Object.is(item, this.value))
        : Object.is(raw, this.value));
    if (stillWanted) {
      (this as any)._focusMonitor?.stopMonitoring?.((this as any)._elementRef);
      return;
    }
    super.ngOnDestroy();
  }
}
