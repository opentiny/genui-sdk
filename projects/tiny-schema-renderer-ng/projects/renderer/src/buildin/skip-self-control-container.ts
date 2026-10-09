import { Directive, forwardRef, inject } from '@angular/core';
import {
  ControlContainer,
  FormArrayName,
  FormControlName,
  FormGroupName,
  NgControl,
  NgModelGroup,
  NG_ASYNC_VALIDATORS,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';

/**
 * `createComponent` hosts are the root TNode of their own host view (`tNode.parent === null`).
 * `{ host: true, skipSelf: true }` therefore cannot walk to a parent NodeInjector, and Host
 * also blocks falling through to `createComponent({ injector })`.
 *
 * `{ skipSelf: true }` without Host does see the parent schema injector. Subclass Angular's
 * directive and re-inject `ControlContainer` without `host`.
 *
 * `{ self: true }` is unchanged: those tokens must live on this TNode (hostDirectives auto-apply).
 */
function injectParentControlContainer(required: true): ControlContainer;
function injectParentControlContainer(required: false): ControlContainer | null;
function injectParentControlContainer(required: boolean): ControlContainer | null {
  return inject(ControlContainer, { skipSelf: true, optional: !required });
}

function injectSelfValidators() {
  return [
    inject(NG_VALIDATORS, { optional: true, self: true }),
    inject(NG_ASYNC_VALIDATORS, { optional: true, self: true }),
  ] as const;
}

@Directive({
  selector: '[ngModelGroup]',
  standalone: true,
  exportAs: 'ngModelGroup',
  providers: [
    { provide: ControlContainer, useExisting: forwardRef(() => SchemaNgModelGroup) },
    { provide: NgModelGroup, useExisting: forwardRef(() => SchemaNgModelGroup) },
  ],
})
export class SchemaNgModelGroup extends NgModelGroup {
  constructor() {
    const [validators, asyncValidators] = injectSelfValidators();
    super(injectParentControlContainer(true), validators as any, asyncValidators as any);
  }
}

@Directive({
  selector: '[formGroupName]',
  standalone: true,
  providers: [
    { provide: ControlContainer, useExisting: forwardRef(() => SchemaFormGroupName) },
    { provide: FormGroupName, useExisting: forwardRef(() => SchemaFormGroupName) },
  ],
})
export class SchemaFormGroupName extends FormGroupName {
  constructor() {
    const [validators, asyncValidators] = injectSelfValidators();
    super(injectParentControlContainer(false) as ControlContainer, validators as any, asyncValidators as any);
  }
}

@Directive({
  selector: '[formArrayName]',
  standalone: true,
  providers: [
    { provide: ControlContainer, useExisting: forwardRef(() => SchemaFormArrayName) },
    { provide: FormArrayName, useExisting: forwardRef(() => SchemaFormArrayName) },
  ],
})
export class SchemaFormArrayName extends FormArrayName {
  constructor() {
    const [validators, asyncValidators] = injectSelfValidators();
    super(injectParentControlContainer(false) as ControlContainer, validators as any, asyncValidators as any);
  }
}

@Directive({
  selector: '[formControlName]',
  standalone: true,
  providers: [
    { provide: NgControl, useExisting: forwardRef(() => SchemaFormControlName) },
    { provide: FormControlName, useExisting: forwardRef(() => SchemaFormControlName) },
  ],
})
export class SchemaFormControlName extends FormControlName {
  constructor() {
    const [validators, asyncValidators] = injectSelfValidators();
    super(
      injectParentControlContainer(false) as ControlContainer,
      validators as any,
      asyncValidators as any,
      inject(NG_VALUE_ACCESSOR, { optional: true, self: true }) as any,
      null,
    );
  }
}
