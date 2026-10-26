import { Directive } from '@angular/core';
import { MatButtonToggleGroup } from '@angular/material/button-toggle';

/**
 * 原因：动态渲染不抛错但行为错（CVA / QueryList 错拍）。
 * 官方 `value` setter / writeValue → `_setSelectionByValue` 每次先 `_clearSelection()`。
 * `_syncButtonToggle(..., false)`（checked setter、ngOnDestroy）会把还该选中的项摘掉。
 * 勾选 UI 读 `_isSelected`，CSS 对 `.mat-button-toggle-checked` 做 width 动画，所以会闪。
 *
 * 空列表时官方还会 valueChange.emit(undefined) 写回 ngModel。
 *
 * DI：adoptStandaloneType 把官方 token alias 到本类。
 * @Directive 仅满足 NG2007；selector/providers 由 adoptStandaloneType 换成官方 ɵdir。
 */
@Directive({
  selector: '[schemaMatButtonToggleGroup]',
  standalone: true,
})
export class SchemaMatButtonToggleGroup extends MatButtonToggleGroup {
  override writeValue(value: any): void {
    if (sameToggleValue(getMatButtonToggleRawValue(this), value)) {
      if (selectionAlreadyMatches(this, value)) {
        return;
      }
    }
    (this as any)._rawValue = value;
    applyMatButtonToggleSelection(this, value);
  }

  override ngAfterContentInit(): void {
    super.ngAfterContentInit();
    const list = (this as any)._buttonToggles;
    list?.changes?.subscribe(() => applyMatButtonToggleSelection(this, getMatButtonToggleRawValue(this)));
    applyMatButtonToggleSelection(this, getMatButtonToggleRawValue(this));
  }
}

const officialValue = Object.getOwnPropertyDescriptor(MatButtonToggleGroup.prototype, 'value');
Object.defineProperty(SchemaMatButtonToggleGroup.prototype, 'value', {
  get: officialValue?.get,
  set: function (this: MatButtonToggleGroup, newValue: unknown) {
    if (sameToggleValue(getMatButtonToggleRawValue(this), newValue) && selectionAlreadyMatches(this, newValue)) {
      return;
    }
    (this as any)._setSelectionByValue(newValue);
  },
  enumerable: true,
  configurable: true,
});

(SchemaMatButtonToggleGroup.prototype as any)._setSelectionByValue = function (this: MatButtonToggleGroup, value: unknown) {
  if (sameToggleValue(getMatButtonToggleRawValue(this), value) && selectionAlreadyMatches(this, value)) {
    return;
  }
  (this as any)._rawValue = value;
  if (!(this as any)._buttonToggles?.length) {
    return;
  }
  applyMatButtonToggleSelection(this, value);
};

(SchemaMatButtonToggleGroup.prototype as any)._syncButtonToggle = function (
  this: MatButtonToggleGroup,
  toggle: any,
  select: boolean,
  isUserInput = false,
) {
  if (!isUserInput && !select && shouldKeepToggleSelected(this as any, toggle)) {
    toggle._checked = true;
    const model = (this as any)._selectionModel;
    if (model && !model.isSelected(toggle)) {
      model.select(toggle);
    }
    return;
  }
  const model = (this as any)._selectionModel;
  const selected = !!model?.isSelected?.(toggle);
  if (!!select === selected && !!toggle._checked === !!select) {
    return;
  }
  if (!this.multiple && select && this.selected && this.selected !== toggle) {
    const prev: any = this.selected;
    prev._checked = false;
    model?.deselect?.(prev);
    prev._changeDetectorRef?.markForCheck?.();
  }
  toggle._checked = !!select;
  if (model) {
    if (select) {
      model.select(toggle);
    } else {
      model.deselect(toggle);
    }
  }
  toggle._changeDetectorRef?.markForCheck?.();
  if (isUserInput) {
    (this as any)._emitChangeEvent?.(toggle);
    (this as any)._onTouched?.();
  }
};

function shouldKeepToggleSelected(group: any, toggle: { value?: unknown }): boolean {
  const raw = getMatButtonToggleRawValue(group);
  if (raw === undefined || raw === null || raw === '') {
    return false;
  }
  if (group.multiple) {
    return Array.isArray(raw) && raw.some((item: unknown) => Object.is(item, toggle.value));
  }
  return Object.is(raw, toggle.value);
}

function sameToggleValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) {
    return true;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => Object.is(item, b[i]));
  }
  return false;
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

function wantedValues(group: any, raw: unknown): Set<unknown> | null {
  if (raw === undefined || raw === null || raw === '') {
    return null;
  }
  if (group.multiple) {
    return new Set(Array.isArray(raw) ? raw : []);
  }
  return new Set([raw]);
}

/** Patch selection in place. Never clear-all — the checkmark binds to `_isSelected`. */
function applyMatButtonToggleSelection(group: any, raw: unknown): void {
  const list = group?._buttonToggles;
  if (!list?.length) {
    return;
  }
  const wanted = wantedValues(group, raw);
  if (!wanted) {
    return;
  }
  if (selectionAlreadyMatches(group, raw)) {
    group.__genuiAppliedRaw = raw;
    return;
  }
  const rawChanged = !sameToggleValue(group.__genuiAppliedRaw, raw);
  const model = group._selectionModel;
  const apply = (toggle: any) => {
    const next = wanted.has(toggle.value);
    const selected = !!model?.isSelected?.(toggle);
    if (next) {
      toggle._checked = true;
    }
    if (!model) {
      return;
    }
    if (next && !selected) {
      model.select(toggle);
      toggle._changeDetectorRef?.markForCheck?.();
    } else if (!next && selected && rawChanged) {
      // Group value actually moved. If raw is unchanged, a child `value` that is
      // still streaming may temporarily miss `wanted` — do not drop the check.
      toggle._checked = false;
      model.deselect(toggle);
      toggle._changeDetectorRef?.markForCheck?.();
    }
  };
  if (typeof list.forEach === 'function') {
    list.forEach(apply);
  } else {
    Array.from(list).forEach(apply);
  }
  group.__genuiAppliedRaw = raw;
}

function selectionAlreadyMatches(group: any, raw: unknown): boolean {
  const list = group?._buttonToggles;
  const wanted = wantedValues(group, raw);
  if (!list?.length || !wanted) {
    return false;
  }
  const model = group._selectionModel;
  let matches = true;
  const check = (toggle: any) => {
    const next = wanted.has(toggle.value);
    const selected = !!model?.isSelected?.(toggle);
    if (toggle._checked !== next || selected !== next) {
      matches = false;
    }
  };
  if (typeof list.forEach === 'function') {
    list.forEach(check);
  } else {
    Array.from(list).forEach(check);
  }
  return matches;
}
