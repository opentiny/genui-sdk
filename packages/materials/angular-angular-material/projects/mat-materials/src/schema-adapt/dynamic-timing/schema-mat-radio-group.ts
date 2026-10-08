import { Directive } from '@angular/core';
import { MatRadioGroup } from '@angular/material/radio';

/**
 * 原因：动态渲染不抛错但行为错（CVA / QueryList 错拍）。
 * 官方 writeValue → value setter 只在 `_value` 变化时更新；schema 时序常在
 * QueryList 为空时 writeValue，子到齐后不再按 `_value` 勾选。
 *
 * 回填：`_updateSelectedRadioFromValue` 走 `radio.checked = ...` setter；
 * 反选时若 `group.value === radio.value` 会 `selected = null`，进而
 * `value = null` 把刚 writeValue 进去的值清掉，state 仍是 green UI 却空着。
 * 改为直接写 `_checked`，并在 QueryList.changes / hostBindings 时按 `_value` 补差。
 *
 * DI：adoptStandaloneType 把官方 token alias 到本类。
 * DoCheck 不会跑（ɵdir 来自官方，无 DoCheck flag），改挂 hostBindings。
 */
@Directive({
  selector: '[schemaMatRadioGroup]',
  standalone: true,
})
export class SchemaMatRadioGroup extends MatRadioGroup {
  override writeValue(value: any): void {
    (this as any)._value = value;
    applyMatRadioSelection(this);
    (this as any)._changeDetector?.markForCheck?.();
  }

  override ngAfterContentInit(): void {
    super.ngAfterContentInit();
    const list = (this as any)._radios;
    list?.changes?.subscribe(() => applyMatRadioSelection(this));
    applyMatRadioSelection(this);
  }
}

const officialValue = Object.getOwnPropertyDescriptor(MatRadioGroup.prototype, 'value');
Object.defineProperty(SchemaMatRadioGroup.prototype, 'value', {
  get: officialValue?.get,
  set: function (this: MatRadioGroup, newValue: unknown) {
    if ((this as any)._value === newValue && radioSelectionMatches(this)) {
      return;
    }
    (this as any)._value = newValue;
    applyMatRadioSelection(this);
  },
  enumerable: true,
  configurable: true,
});

/** Call after `adoptStandaloneType` so hostBindings heal runs every CD. */
export function installSchemaMatRadioGroupHostHeal(): void {
  const dir = (SchemaMatRadioGroup as any).ɵdir;
  if (!dir || dir.__genuiHostPatched) {
    return;
  }
  const parentHost = Object.getPrototypeOf(dir)?.hostBindings as ((rf: number, ctx: unknown) => void) | undefined;
  const ownHost = dir.hostBindings as ((rf: number, ctx: unknown) => void) | undefined;
  const baseHost = ownHost ?? parentHost;
  dir.hostBindings = function SchemaMatRadioGroup_HostHeal(rf: number, ctx: unknown) {
    baseHost?.(rf, ctx);
    applyMatRadioSelection(ctx);
  };
  dir.__genuiHostPatched = true;
}

/** Patch selection in place. Never go through `checked` setter (it can null out group.value). */
function applyMatRadioSelection(group: any): void {
  const list = group?._radios;
  if (!list?.length) {
    return;
  }
  if (radioSelectionMatches(group)) {
    return;
  }
  const raw = group._value;
  let nextSelected: any = null;
  const apply = (radio: any) => {
    // Direct `_checked` only — never `checked` setter / radioDispatcher.notify
    // (both can `selected = null` → wipe `_value` while ngModel state stays).
    const should = raw === radio.value;
    if (radio._checked !== should) {
      radio._checked = should;
      radio._changeDetector?.markForCheck?.();
    }
    if (should) {
      nextSelected = radio;
    }
  };
  if (typeof list.forEach === 'function') {
    list.forEach(apply);
  } else {
    Array.from(list).forEach(apply);
  }
  // Assign field directly — `selected` setter would write `value = null` when clearing.
  group._selected = nextSelected;
  group._markRadiosForCheck?.();
}

function radioSelectionMatches(group: any): boolean {
  const list = group?._radios;
  if (!list?.length) {
    return false;
  }
  const raw = group._value;
  let selected: any = null;
  let matches = true;
  const check = (radio: any) => {
    const should = raw === radio.value;
    if (!!radio._checked !== should) {
      matches = false;
    }
    if (should) {
      selected = radio;
    }
  };
  if (typeof list.forEach === 'function') {
    list.forEach(check);
  } else {
    Array.from(list).forEach(check);
  }
  if (group._selected !== selected) {
    matches = false;
  }
  return matches;
}
