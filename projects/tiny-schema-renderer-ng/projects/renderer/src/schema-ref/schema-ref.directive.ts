import {
  ComponentRef,
  Directive,
  Input,
  OnChanges,
  OnDestroy,
  Optional,
  Self,
  SimpleChanges,
  forwardRef,
} from '@angular/core';
import { ComponentOutlet } from '../component-outlet';
import { SchemaRefBinding, getRefName } from './schema-ref-binding';
import { SCHEMA_REF_BRIDGE, SchemaRefBridge } from './schema-ref-bridge';

/**
 * Companion to `[componentOutlet]`: owns schema `props.ref` / `props.refName` for
 * component hosts. Ref value is the component instance (or nativeElement for
 * native/dynamic tags). Template hosts are handled by {@link SchemaRefTemplateDirective}.
 *
 * Lifecycle comes from {@link SCHEMA_REF_BRIDGE} (outlet attach/detach); ref/refName
 * are read from `outlet.ngComponentOutletProps`.
 *
 * - `props.ref` → page `this.refs`
 * - `props.refName` → `scope[refName] = value`
 */
@Directive({
  selector: '[componentOutlet]',
  standalone: true,
  providers: [
    {
      provide: SCHEMA_REF_BRIDGE,
      useExisting: forwardRef(() => SchemaRefDirective),
    },
  ],
})
export class SchemaRefDirective implements SchemaRefBridge, OnChanges, OnDestroy {
  /** Current render scope (page / loop mergeScope). */
  @Input('schemaRefScope') scope: Record<string, any> | null | undefined;

  private readonly binding = new SchemaRefBinding();
  private attachedRef: ComponentRef<any> | undefined;

  constructor(
    @Optional()
    @Self()
    private readonly outlet: ComponentOutlet | null,
  ) {}

  attach(componentRef: ComponentRef<any>): void {
    this.binding.clear();
    this.attachedRef = componentRef;
    const props = (this.outlet?.ngComponentOutletProps ?? {}) as Record<string, any>;
    this.binding.register(componentRef, props, {
      scope: this.scope,
      refName: getRefName(props),
    });
  }

  detach(): void {
    this.binding.clear();
    this.attachedRef = undefined;
  }

  ngOnChanges(changes: SimpleChanges) {
    // Remount is handled by attach/detach — only refresh local #name here.
    if (!this.attachedRef || !changes['scope']) {
      return;
    }
    const props = (this.outlet?.ngComponentOutletProps ?? {}) as Record<string, any>;
    if (!getRefName(props)) {
      // Looped outlets get a new mergeScope object every CD — ignore when unused.
      return;
    }
    this.binding.syncLocalRef(this.attachedRef, {
      scope: this.scope,
      refName: getRefName(props),
    });
  }

  ngOnDestroy() {
    this.detach();
  }
}
