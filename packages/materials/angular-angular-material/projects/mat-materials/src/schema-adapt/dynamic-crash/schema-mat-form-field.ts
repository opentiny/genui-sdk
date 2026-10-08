import { Component } from '@angular/core';
import { MatFormField } from '@angular/material/form-field';
import { EMPTY } from 'rxjs';

/**
 * 原因 A：动态渲染会抛错 — ContentChild(MatFormFieldControl) 首帧为空。
 * 原因 B：mat-label 晚于 NotchedOutline init，`--no-label` 把 floating label 藏死。
 * 原因 C：noop → 真实 control / 晚到的 ngModel 时，OnPush 下 `[floating]` 仍停在 false，
 * label 不浮起。`upgradeNotchedOutline` 只修 notch，需补 markForCheck。
 * `_control` 与 notch 只打在本子类，不改官方 MatFormField.prototype。
 */
@Component({
  selector: 'schema-mat-form-field',
  standalone: true,
  template: '',
})
export class SchemaMatFormField extends MatFormField {
  override ngAfterContentChecked(): void {
    const prevType = (this as any)._previousControl?.controlType as string | undefined;
    super.ngAfterContentChecked();
    const host = (this as any)._elementRef?.nativeElement as HTMLElement | undefined;
    upgradeNotchedOutline(host);
    maybeMarkFloatingLabel(this, prevType, host);
  }
}

const officialControl = Object.getOwnPropertyDescriptor(MatFormField.prototype, '_control');
const noopByInstance = new WeakMap<object, any>();

Object.defineProperty(SchemaMatFormField.prototype, '_control', {
  configurable: true,
  enumerable: false,
  get(this: object) {
    const value = officialControl?.get?.call(this);
    if (value) {
      return value;
    }
    let noop = noopByInstance.get(this);
    if (!noop) {
      noop = createNoopControl();
      noopByInstance.set(this, noop);
    }
    return noop;
  },
  set(this: object, value: unknown) {
    if (officialControl?.set) {
      officialControl.set.call(this, value);
      return;
    }
    (this as { _explicitFormFieldControl?: unknown })._explicitFormFieldControl = value;
  },
});

function createNoopControl(): any {
  return {
    value: undefined,
    placeholder: '',
    id: '',
    ngControl: undefined,
    focused: false,
    empty: true,
    shouldLabelFloat: false,
    required: false,
    disabled: false,
    errorState: false,
    controlType: 'genui-noop',
    autofilled: false,
    userAriaDescribedBy: undefined,
    disableAutomaticLabeling: false,
    describedByIds: [],
    stateChanges: EMPTY,
    onContainerClick: () => {},
    setDescribedByIds: () => {},
  };
}

function upgradeNotchedOutline(host: HTMLElement | null | undefined): void {
  if (!host) {
    return;
  }
  host.querySelectorAll('.mdc-notched-outline.mdc-notched-outline--no-label').forEach((outline) => {
    if (outline.querySelector('.mdc-floating-label')) {
      outline.classList.remove('mdc-notched-outline--no-label');
      outline.classList.add('mdc-notched-outline--upgraded');
    }
  });
}

/**
 * Refresh OnPush `[floating]` when control attaches late or float DOM drifts.
 * Setting `floatingLabel.floating` updates the MDC float class; markForCheck
 * covers the noop → real-control case where the bound value was still false.
 */
function maybeMarkFloatingLabel(field: MatFormField, prevType: string | undefined, host?: HTMLElement): void {
  const control = (field as any)._control;
  if (!control || control.controlType === 'genui-noop') {
    return;
  }
  const shouldFloat =
    typeof (field as any)._shouldLabelFloat === 'function' ? !!(field as any)._shouldLabelFloat() : false;
  const floatingLabel = (field as any)._floatingLabel as
    | { floating: boolean; element?: HTMLElement }
    | undefined;
  const controlChanged = prevType !== control.controlType;
  let dirty = controlChanged;

  if (floatingLabel && floatingLabel.floating !== shouldFloat) {
    floatingLabel.floating = shouldFloat;
    dirty = true;
  }

  const labelEl =
    floatingLabel?.element ?? (host?.querySelector?.('.mdc-floating-label') as HTMLElement | null | undefined);
  const floated = !!labelEl?.classList?.contains('mdc-floating-label--float-above');
  if (labelEl && shouldFloat !== floated) {
    labelEl.classList.toggle('mdc-floating-label--float-above', shouldFloat);
    dirty = true;
  }

  if (dirty) {
    (field as any)._changeDetectorRef?.markForCheck?.();
  }
}
