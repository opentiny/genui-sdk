import { Directive, Input } from '@angular/core';

/**
 * Demo host directive on ListItem — queried via contentChildren(ListItemMarkerDirective).
 */
@Directive({
  selector: '[listItemMarker]',
  exportAs: 'listItemMarker',
  standalone: true,
})
export class ListItemMarkerDirective {
  @Input() listItemMarker = '';
}
