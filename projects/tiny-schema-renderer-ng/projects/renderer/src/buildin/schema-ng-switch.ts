import { Directive } from '@angular/core';
import { NgSwitch } from '@angular/common';

/**
 * Schema host-directive stand-in for `NgSwitch`.
 *
 * Ensures `NgSwitch` is an explicit DI provider on the component host so projected
 * schema `NgSwitchCase` / `NgSwitchDefault` instances can resolve it via the parent
 * component injector (native host-directive lookup is unreliable across projected
 * slot views).
 */
@Directive({
  selector: '[schemaNgSwitch]',
  standalone: true,
  inputs: ['ngSwitch'],
  providers: [{ provide: NgSwitch, useExisting: SchemaNgSwitch }],
})
export class SchemaNgSwitch extends NgSwitch {}
