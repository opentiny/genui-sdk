import { Directive, inject } from '@angular/core';
import { ControlContainer } from '@angular/forms';

/**
 * Host directive on ngModel (and similar) hosts.
 *
 * NgModel injects ControlContainer with `{ host: true }`, which only sees providers on
 * the current host. Schema children are created in a detached view, so NgForm on a
 * parent `<form>` is not a TNode ancestor. This directive re-provides ControlContainer
 * from the parent injector onto the field host so `{ host: true }` succeeds.
 */
@Directive({
  selector: '[ngControlContainerHost]',
  standalone: true,
  providers: [
    {
      provide: ControlContainer,
      useFactory: () => inject(ControlContainer, { skipSelf: true, optional: true }),
    },
  ],
})
export class NgControlContainerHostBridge {}
