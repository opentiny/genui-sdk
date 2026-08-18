import {
  ComponentRef,
  Directive,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  inject,
} from '@angular/core';
import { ComponentOutlet } from '../component-outlet';
import { SchemaRefBinding } from './schema-ref-binding';
import { SCHEMA_REF_BRIDGE, SchemaRefBridge } from './schema-ref-bridge';

/**
 * Companion to `[componentOutlet]`: wires schema `props.ref` / `props.refName`.
 *
 * Lifecycle comes from {@link SCHEMA_REF_BRIDGE} (outlet attach/detach) — not ngDoCheck and
 * not mirroring `componentOutletContent` (that churns every CD and caused infinite loops).
 *
 * - `props.ref` → page `this.refs`
 * - `props.refName` → `scope[refName] = instance`
 */
@Directive({
  selector: '[componentOutlet]',
  standalone: true,
  providers: [
    {
      provide: SCHEMA_REF_BRIDGE,
      useExisting: SchemaRefDirective,
    },
  ],
})
export class SchemaRefDirective implements SchemaRefBridge, OnChanges, OnDestroy {
  /** Current render scope (page / loop mergeScope). */
  @Input('schemaRefScope') scope: Record<string, any> | null | undefined;
  /** Schema `props.refName`. */
  @Input('schemaRefName') refName: string | null | undefined;

  private readonly outlet = inject(ComponentOutlet);
  private readonly binding = new SchemaRefBinding();
  private attachedRef: ComponentRef<any> | undefined;

  attach(componentRef: ComponentRef<any>): void {
    this.binding.clear();
    this.attachedRef = componentRef;
    const props = (this.outlet.ngComponentOutletProps ?? {}) as Record<string, any>;
    this.binding.register(componentRef, props, {
      scope: this.scope,
      refName: this.refName,
    });
  }

  detach(): void {
    this.binding.clear();
    this.attachedRef = undefined;
  }

  ngOnChanges(changes: SimpleChanges) {
    // Remount is handled by attach/detach. Here only refresh local #name when scope/name change.
    if (!this.attachedRef) {
      return;
    }
    if (!changes['scope'] && !changes['refName']) {
      return;
    }
    const name =
      typeof this.refName === 'string' && this.refName.trim() ? this.refName.trim() : null;
    if (!name && !changes['refName']) {
      // Looped outlets get a new mergeScope object every CD — ignore when unused.
      return;
    }
    this.binding.syncLocalRef(this.attachedRef, {
      scope: this.scope,
      refName: this.refName,
    });
  }

  ngOnDestroy() {
    this.detach();
  }
}
