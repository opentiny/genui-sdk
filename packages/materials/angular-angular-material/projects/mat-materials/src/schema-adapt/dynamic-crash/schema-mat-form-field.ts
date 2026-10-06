import { Component } from '@angular/core';
import { MatFormField } from '@angular/material/form-field';
import { EMPTY } from 'rxjs';

/**
 * 原因 A：动态渲染会抛错 — ContentChild(MatFormFieldControl) 首帧为空。
 * 原因 B：mat-label 晚于 NotchedOutline init，`--no-label` 把 floating label 藏死。
 * `_control` 与 notch 只打在本子类，不改官方 MatFormField.prototype。
 */
@Component({
  selector: 'schema-mat-form-field',
  standalone: true,
  template: '',
})
export class SchemaMatFormField extends MatFormField {
  override ngAfterContentChecked(): void {
    super.ngAfterContentChecked();
    upgradeNotchedOutline((this as any)._elementRef?.nativeElement as HTMLElement | undefined);
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
