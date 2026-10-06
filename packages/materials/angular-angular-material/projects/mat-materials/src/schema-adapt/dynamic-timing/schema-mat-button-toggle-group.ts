import { Directive } from '@angular/core';
import { MatButtonToggleGroup } from '@angular/material/button-toggle';

/**
 * 原因：动态渲染不抛错但行为错（CVA / QueryList 错拍）。
 * 官方假设：writeValue 时 `_buttonToggles` 已有子项；value getter 读 `_selectionModel`。
 * schema 时序：组上 ngModel 常在 QueryList 为空时 writeValue。原 `this.value = x` 会
 * valueChange.emit(undefined)。子到齐后需按 `_rawValue` 静默同步 `_checked`。
 *
 * DI：空宿主 + 本指令拆开后，子 MatButtonToggle 仍注入 MatButtonToggleGroup token，
 * adoptStandaloneType 会在本类 ɵdir.providers 上 provide 官方 token。
 * @Directive 仅满足 NG2007；selector/providers 由 adoptStandaloneType 换成官方 ɵdir。
 */
@Directive({
  selector: '[schemaMatButtonToggleGroup]',
  standalone: true,
})
export class SchemaMatButtonToggleGroup extends MatButtonToggleGroup {
  override writeValue(value: any): void {
    const count = (this as any)._buttonToggles?.length ?? 0;
    (this as any)._rawValue = value;
    if (!count) {
      (this as any)._changeDetector?.markForCheck?.();
      return;
    }
    super.writeValue(value);
    (this as any)._rawValue = value;
    syncMatButtonToggleChecked(this);
  }

  override ngAfterContentInit(): void {
    super.ngAfterContentInit();
    const list = (this as any)._buttonToggles;
    list?.changes?.subscribe(() => syncMatButtonToggleChecked(this));
    syncMatButtonToggleChecked(this);
  }
}

function getMatButtonToggleRawValue(group: any): unknown {
  if (group._rawValue !== undefined) {
    return group._rawValue;
  }
  if (group._value !== undefined) {
    return group._value;
  }
  return group.value;
}

function syncMatButtonToggleChecked(group: any): void {
  const list = group?._buttonToggles;
  const count = list?.length ?? 0;
  if (!count) {
    return;
  }
  const raw = getMatButtonToggleRawValue(group);
  if (raw === undefined || raw === null || raw === '') {
    return;
  }
  const token = `${count}:${group.multiple ? JSON.stringify(raw) : String(raw)}`;
  if (group.__genuiToggleToken === token) {
    return;
  }
  const selected = group.multiple
    ? new Set(Array.isArray(raw) ? raw : [])
    : new Set([raw]);
  const apply = (toggle: any) => {
    const next = selected.has(toggle.value);
    if (toggle._checked !== next) {
      toggle._checked = next;
      toggle._changeDetectorRef?.markForCheck?.();
    }
  };
  if (typeof list.forEach === 'function') {
    list.forEach(apply);
  } else {
    Array.from(list).forEach(apply);
  }
  const model = group._selectionModel;
  if (model && typeof model.clear === 'function' && typeof model.select === 'function') {
    model.clear();
    const checked: any[] = [];
    if (typeof list.forEach === 'function') {
      list.forEach((toggle: any) => {
        if (toggle._checked) {
          checked.push(toggle);
        }
      });
    }
    if (checked.length) {
      model.select(...checked);
    }
  }
  group.__genuiToggleToken = token;
}
