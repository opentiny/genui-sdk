import { ComponentRef, InjectionToken } from '@angular/core';

/** Optional self-hook: {@link SchemaRefDirective} attaches/detaches when outlet creates/clears. */
export interface SchemaRefBridge {
  attach(componentRef: ComponentRef<any>): void;
  detach(): void;
}

export const SCHEMA_REF_BRIDGE = new InjectionToken<SchemaRefBridge>('SCHEMA_REF_BRIDGE');
