import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-list-item',
  exportAs: 'listItem',
  standalone: true,
  template: `
    <li class="demo-list-item">
      <ng-content></ng-content>
      @if (label) {
        <span>{{ label }}</span>
      }
    </li>
  `,
  styles: [
    `
      .demo-list-item {
        padding: 6px 10px;
        border-bottom: 1px solid #e5e7eb;
        list-style: none;
      }
    `,
  ],
})
export class ListItemComponent {
  @Input() label = '';
}
