import { Directive, inject } from '@angular/core';
import { SelectControlValueAccessor, SelectMultipleControlValueAccessor } from '@angular/forms';

/**
 * Host directive on native `<option>`.
 *
 * `NgSelectOption` / `ɵNgSelectMultipleOption` inject the select CVA with `{ host: true }`,
 * which only sees providers on the option host. Schema children are created in a detached
 * view, so the parent `<select>` is not a TNode ancestor. Re-provide the accessors from the
 * parent injector so `{ host: true }` can register `ngValue` object options.
 */
@Directive({
  selector: '[ngSelectOptionHost]',
  standalone: true,
  providers: [
    {
      provide: SelectControlValueAccessor,
      useFactory: () => inject(SelectControlValueAccessor, { skipSelf: true, optional: true }),
    },
    {
      provide: SelectMultipleControlValueAccessor,
      useFactory: () => inject(SelectMultipleControlValueAccessor, { skipSelf: true, optional: true }),
    },
  ],
})
export class NgSelectOptionHostBridge {}
