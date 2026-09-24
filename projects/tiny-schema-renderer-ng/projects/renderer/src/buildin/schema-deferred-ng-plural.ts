import { Directive, inject } from '@angular/core';
import { NgLocalization, NgPlural } from '@angular/common';

/**
 * Schema host-directive stand-in for `NgPlural`.
 *
 * With `createComponent` + projected schema children, the parent's `ngPlural` input is
 * applied before projected cases call `addCase`. Real `NgPlural` throws NG02308 when
 * `_caseViews` is still empty. Queue the value and re-apply from {@link addCase} as
 * each case self-registers (no renderer type checks).
 */
@Directive({
  selector: '[schemaDeferredNgPlural]',
  standalone: true,
  inputs: ['ngPlural'],
  providers: [{ provide: NgPlural, useExisting: SchemaDeferredNgPlural }],
})
export class SchemaDeferredNgPlural extends NgPlural {
  private queued: unknown;
  private hasQueued = false;
  private caseCount = 0;

  constructor() {
    super(inject(NgLocalization));
  }

  override set ngPlural(value: number) {
    this.queued = value;
    this.hasQueued = true;
    if (this.caseCount === 0) {
      return;
    }
    super.ngPlural = value;
  }

  override addCase(value: string, switchView: unknown): void {
    super.addCase(value, switchView as never);
    this.caseCount++;
    if (!this.hasQueued) {
      return;
    }
    try {
      super.ngPlural = this.queued as number;
    } catch {
      // Not all categories registered yet — later addCase calls will retry.
    }
  }

  /** 供 companion bridge 在修复 `_caseViews` 后重放排队值。 */
  flushQueued(): void {
    if (this.hasQueued && this.queued !== undefined) {
      this.ngPlural = this.queued as number;
    }
  }
}
