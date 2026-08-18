import { ComponentRef } from '@angular/core';
import { NativeElementComponent } from '../native-element.component';

/** Vue-like function ref from props.ref: `(instance) => this.refs.xxx = instance`. */
export type SchemaRefFn = (value: unknown) => void;

/** Local template scope options — props.refName ≈ Angular `#name` on the host. */
export interface SchemaLocalRefOptions {
  /** Current render scope (page / loop mergeScope). */
  scope?: Record<string, any> | null;
  /** Schema `props.refName` — writes `scope[refName] = instance`. */
  refName?: string | null;
}

/** props.ref / props.refName — schema wiring, never component @Input / host attribute. */
export function isSchemaRefPropKey(key: string): boolean {
  return key === 'ref' || key === 'refName';
}

/** Extract `props.refName` from parsed schema props (plain string). */
export function getRefName(props: Record<string, any> | null | undefined): string | null {
  const name = props?.['refName'];
  return typeof name === 'string' && name.trim() ? name.trim() : null;
}

  /**
   * Resolve the value stored in `this.refs` / local scope:
   * nativeElement for native/dynamic tags, component instance for materials.
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

function normalizeRefName(refName: string | null | undefined): string | null {
  return typeof refName === 'string' && refName.trim() ? refName.trim() : null;
}

/** Owns register / clear / sync for props.ref (this.refs) and props.refName (scope). */
export class SchemaRefBinding {
  private activeFn: SchemaRefFn | undefined;
  private activeScope: Record<string, any> | null = null;
  private activeRefName: string | null = null;

  register(
    componentRef: ComponentRef<any> | undefined,
    bindProps: Record<string, any>,
    local?: SchemaLocalRefOptions,
  ): void {
    if (!componentRef) {
      return;
    }
    this.registerValue(resolveSchemaRefValue(componentRef), bindProps, local);
  }

  /** Register a ref value directly (instance / nativeElement / TemplateRef). */
  registerValue(
    value: unknown,
    bindProps: Record<string, any>,
    local?: SchemaLocalRefOptions,
  ): void {
    const refFn = getSchemaRefFn(bindProps);
    this.activeFn = refFn;
    refFn?.(value);

    this.writeLocalRef(local?.scope, local?.refName, value);
  }

  clear(): void {
    if (this.activeFn) {
      this.activeFn(null);
      this.activeFn = undefined;
    }
    this.clearLocalRef();
  }

  /** Re-bind when the ref callback identity changed (parseData rebuilds it each CD). */
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
    if (this.activeFn) {
      this.activeFn(null);
      this.activeFn = undefined;
    }
  }

  /** Refresh local #name when scope/refName change without remounting the outlet. */
  syncLocalRef(
    componentRef: ComponentRef<any> | undefined,
    local?: SchemaLocalRefOptions,
  ): void {
    if (!componentRef) {
      this.clearLocalRef();
      return;
    }
    this.writeLocalRef(local?.scope, local?.refName, resolveSchemaRefValue(componentRef));
  }

  private writeLocalRef(
    scope: Record<string, any> | null | undefined,
    refName: string | null | undefined,
    value: unknown,
  ): void {
    const name = normalizeRefName(refName);
    if (
      this.activeScope === scope &&
      this.activeRefName === name &&
      name &&
      scope &&
      scope[name] === value
    ) {
      return;
    }
    this.clearLocalRef();
    if (!scope || !name) {
      return;
    }
    scope[name] = value;
    this.activeScope = scope;
    this.activeRefName = name;
  }

  private clearLocalRef(): void {
    if (this.activeScope && this.activeRefName) {
      delete this.activeScope[this.activeRefName];
    }
    this.activeScope = null;
    this.activeRefName = null;
  }
}
