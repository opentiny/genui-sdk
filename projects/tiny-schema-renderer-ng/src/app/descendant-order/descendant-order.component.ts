import {
  AfterContentChecked,
  Component,
  ContentChildren,
  Input,
  QueryList,
  contentChildren,
} from '@angular/core';

/** Nested node. A scan of these with `{ descendants: true }` should be preorder. */
@Component({
  selector: 'descendant-node',
  standalone: true,
  template: `
    <div class="descendant-node">
      <span>{{ name }}</span>
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    `
      .descendant-node {
        margin: 4px 0 4px 12px;
        padding: 4px 8px;
        border-left: 2px solid #94a3b8;
      }
    `,
  ],
})
export class DescendantNodeComponent {
  @Input() name = '';
}

/**
 * Scans projected DescendantNode children.
 * Direct children stay A, B. descendants: true must be A, C, B when C is inside A.
 */
@Component({
  selector: 'descendant-scan',
  standalone: true,
  template: `
    <div class="descendant-scan">
      <div>direct: {{ directOrder }}</div>
      <div>descendants: {{ descendantOrder }}</div>
      <div>signal descendants: {{ signalOrder }}</div>
      <div>期望 descendants: A, C, B</div>
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    `
      .descendant-scan {
        font: 14px/1.6 sans-serif;
      }
    `,
  ],
})
export class DescendantScanComponent implements AfterContentChecked {
  @ContentChildren(DescendantNodeComponent) directItems!: QueryList<DescendantNodeComponent>;
  @ContentChildren(DescendantNodeComponent, { descendants: true })
  descendantItems!: QueryList<DescendantNodeComponent>;
  readonly signalItems = contentChildren(DescendantNodeComponent, { descendants: true });

  private lastLogged = '';

  get directOrder(): string {
    return this.join(this.directItems);
  }

  get descendantOrder(): string {
    return this.join(this.descendantItems);
  }

  get signalOrder(): string {
    return this.signalItems().map((item) => item.name).join(', ');
  }

  ngAfterContentChecked(): void {
    const order = `direct=[${this.directOrder}] descendants=[${this.descendantOrder}] signal=[${this.signalOrder}]`;
    if (!this.descendantOrder || order === this.lastLogged) {
      return;
    }
    this.lastLogged = order;
    console.log('[descendant order]', order);
  }

  private join(list: QueryList<DescendantNodeComponent> | undefined): string {
    return list?.map((item) => item.name).join(', ') ?? '';
  }
}
