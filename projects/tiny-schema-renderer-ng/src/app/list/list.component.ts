import {
  Component,
  ContentChild,
  ContentChildren,
  QueryList,
  contentChild,
  contentChildren,
} from '@angular/core';
import { ListItemComponent } from './list-item.component';

/**
 * Demo material — normal pattern: bind QueryList / content queries in template.
 * Does not call detectChanges(); renderer patch bridge is responsible for refreshing.
 */
@Component({
  selector: 'app-list',
  standalone: true,
  template: `
    <div class="demo-list">
      <div class="demo-list__header">
        <div>@ContentChildren length: {{ items.length }}</div>
        <div>@ContentChild first: {{ firstItem?.label || '(none)' }}</div>
        <div>contentChildren() length: {{ signalItems().length }}</div>
        <div>contentChild() first: {{ signalFirst()?.label || '(none)' }}</div>
        <div>contentChild('listHeader'): {{ namedHeader()?.label || '(none)' }}</div>
      </div>
      <ul class="demo-list__body">
        <ng-content></ng-content>
      </ul>
    </div>
  `,
  styles: [
    `
      .demo-list {
        border: 1px solid #d1d5db;
        border-radius: 6px;
        overflow: hidden;
        background: #fff;
      }
      .demo-list__header {
        padding: 8px 12px;
        font-weight: 600;
        background: #f3f4f6;
        border-bottom: 1px solid #e5e7eb;
        display: grid;
        gap: 4px;
        font-size: 13px;
      }
      .demo-list__body {
        margin: 0;
        padding: 0;
      }
    `,
  ],
})
export class ListComponent {
  @ContentChildren(ListItemComponent) items!: QueryList<ListItemComponent>;
  @ContentChild(ListItemComponent) firstItem?: ListItemComponent;

  readonly signalItems = contentChildren(ListItemComponent);
  readonly signalFirst = contentChild(ListItemComponent);
  /** String selector — matches schema child with `"refName": "listHeader"` (like `#listHeader`). */
  readonly namedHeader = contentChild<ListItemComponent>('listHeader');
}
