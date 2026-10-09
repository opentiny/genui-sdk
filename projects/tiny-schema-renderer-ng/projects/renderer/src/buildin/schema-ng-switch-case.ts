import { Directive, forwardRef, inject, TemplateRef, ViewContainerRef } from '@angular/core';
import { NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';

/**
 * Schema replacements for `NgSwitchCase` / `NgSwitchDefault`.
 *
 * Real Angular factories inject `NgSwitch` with `{ host: true }`. Projected schema
 * `NgTemplate` hosts are not under that host TNode, so resolve the parent switch with
 * `{ skipSelf: true }` instead (same idea as {@link SchemaNgModelGroup}).
 */
@Directive({
  selector: '[ngSwitchCase]',
  standalone: true,
  inputs: ['ngSwitchCase'],
  providers: [{ provide: NgSwitchCase, useExisting: forwardRef(() => SchemaNgSwitchCase) }],
})
export class SchemaNgSwitchCase extends NgSwitchCase {
  constructor() {
    super(
      inject(ViewContainerRef),
      inject(TemplateRef),
      inject(NgSwitch, { skipSelf: true, optional: true })!,
    );
  }
}

@Directive({
  selector: '[ngSwitchDefault]',
  standalone: true,
  providers: [{ provide: NgSwitchDefault, useExisting: forwardRef(() => SchemaNgSwitchDefault) }],
})
export class SchemaNgSwitchDefault extends NgSwitchDefault {
  constructor() {
    super(
      inject(ViewContainerRef),
      inject(TemplateRef),
      inject(NgSwitch, { skipSelf: true, optional: true })!,
    );
  }
}
