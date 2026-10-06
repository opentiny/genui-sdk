import { Directive } from '@angular/core';
import { MatRadioGroup } from '@angular/material/radio';

/**
 * 原因：动态渲染不抛错但行为错（CVA / QueryList 错拍）。
 * 官方假设：writeValue 时 `_radios` 已有子项；value setter 只在 `_value` 变化时
 * 调 `_updateSelectedRadioFromValue`。schema 时序：组上 ngModel 常在 QueryList 为空时
 * writeValue，只记下 `_value`。子到齐后 `_radios.changes` 官方只清失效 selected，
 * 不再按 `_value` 勾选，直接渲染默认值选不中；流式后到的 writeValue 则能选中。
 *
 * DI：空宿主 + 本指令拆开后，子 MatRadioButton 注入 MAT_RADIO_GROUP（useExisting
 * MatRadioGroup）。adoptStandaloneType 会把官方 token alias 到本类。
 * @Directive 仅满足 NG2007；selector/providers 由 adoptStandaloneType 换成官方 ɵdir。
 */
@Directive({
  selector: '[schemaMatRadioGroup]',
  standalone: true,
})
export class SchemaMatRadioGroup extends MatRadioGroup {
  override writeValue(value: any): void {
    const count = (this as any)._radios?.length ?? 0;
    if (!count) {
      (this as any)._value = value;
      (this as any)._changeDetector?.markForCheck?.();
      return;
    }
    super.writeValue(value);
    syncMatRadioChecked(this);
  }

  override ngAfterContentInit(): void {
    super.ngAfterContentInit();
    const list = (this as any)._radios;
    list?.changes?.subscribe(() => syncMatRadioChecked(this));
    syncMatRadioChecked(this);
  }
}

function syncMatRadioChecked(group: any): void {
  const list = group?._radios;
  const count = list?.length ?? 0;
  if (!count) {
    return;
  }
  const raw = group._value;
  if (raw === undefined) {
    return;
  }
  const token = `${count}:${String(raw)}`;
  if (group.__genuiRadioToken === token) {
    return;
  }
  group._selected = null;
  group._updateSelectedRadioFromValue?.();
  group._checkSelectedRadioButton?.();
  group._markRadiosForCheck?.();
  group.__genuiRadioToken = token;
}
