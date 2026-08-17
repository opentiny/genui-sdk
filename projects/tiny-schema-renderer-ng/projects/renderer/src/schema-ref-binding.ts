import { ComponentRef } from '@angular/core';
import { NativeElementComponent } from './native-element.component';

/** Vue-like function ref from props.ref: `(instance) => this.refs.xxx = instance`. */
export type SchemaRefFn = (value: unknown) => void;

/** props.ref is schema ViewChild wiring — never a component @Input / host attribute. */
export function isSchemaRefPropKey(key: string): boolean {
  return key === 'ref';
}

/**
 * Resolve what to store in `this.refs`:
 * - HTML / dynamic tag / custom-element host → nativeElement
 * - material component → component instance
 */
export function resolveSchemaRefValue(componentRef: ComponentRef<any>): unknown {
  if (componentRef.instance instanceof NativeElementComponent) {
    return componentRef.location.nativeElement;
  }
  return componentRef.instance;
}

function getSchemaRefFn(bindProps: Record<string, any> | undefined): SchemaRefFn | undefined {
  const ref = bindProps?.['ref'];
  return typeof ref === 'function' ? (ref as SchemaRefFn) : undefined;
}

/**
 * Owns register / clear / props-sync for one ComponentOutlet's props.ref binding.
 * Keeps outlet create/destroy code thin (Vue function-ref semantics).
 */
export class SchemaRefBinding {
  private activeFn: SchemaRefFn | undefined;

  register(componentRef: ComponentRef<any> | undefined, bindProps: Record<string, any>): void {
    if (!componentRef) {
      return;
    }
    const refFn = getSchemaRefFn(bindProps);
    this.activeFn = refFn;
    refFn?.(resolveSchemaRefValue(componentRef));
  }

  clear(): void {
    if (this.activeFn) {
      this.activeFn(null);
      this.activeFn = undefined;
    }
  }

  /**
   * When only props change: re-bind if the ref callback identity changed.
   * parseData rebuilds the function each CD — re-assign without nulling to avoid
   * clearing this.refs.* for one tick.
   */
  syncFromProps(
    componentRef: ComponentRef<any> | undefined,
    bindProps: Record<string, any>,
  ): void {
    const next = getSchemaRefFn(bindProps);
    if (next === this.activeFn) {
      return;
    }
    if (componentRef && next) {
      this.activeFn = next;
      next(resolveSchemaRefValue(componentRef));
      return;
    }
    this.clear();
  }
}
