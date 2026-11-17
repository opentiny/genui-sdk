import { AfterContentChecked, Component, Input, contentChild, contentChildren } from '@angular/core';

/** Projected child. Two of these sit directly under the scan. */
@Component({
  selector: 'cardinality-node',
  standalone: true,
  template: `<span>{{ name }}</span>`,
})
export class CardinalityNodeComponent {
  @Input() name = '';
}

/**
 * Field names are the ones the old name heuristic gets backwards.
 * `data` does not look plural, but it is contentChildren and must stay an array.
 * `items` looks plural, but it is contentChild and must stay a single value.
 */
@Component({
  selector: 'cardinality-scan',
  standalone: true,
  template: `
    <div class="cardinality-scan">
      <div>data = contentChildren，形状: {{ dataShape }}，值: {{ dataNames }}</div>
      <div>items = contentChild，形状: {{ itemsShape }}，值: {{ itemsName }}</div>
      <div>期望: data 是数组 A, B；items 是单值 A</div>
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    `
      .cardinality-scan {
        font: 14px/1.6 sans-serif;
      }
    `,
  ],
})
export class CardinalityScanComponent implements AfterContentChecked {
  readonly data = contentChildren(CardinalityNodeComponent);
  readonly items = contentChild(CardinalityNodeComponent);

  private lastLogged = '';

  get dataShape(): string {
    return Array.isArray(this.data()) ? 'array' : 'single';
  }

  get dataNames(): string {
    return this.namesOf(this.data());
  }

  get itemsShape(): string {
    return Array.isArray(this.items()) ? 'array' : 'single';
  }

  get itemsName(): string {
    return this.namesOf(this.items());
  }

  ngAfterContentChecked(): void {
    const line = `data=${this.dataShape} [${this.dataNames}] items=${this.itemsShape} [${this.itemsName}]`;
    if (!this.dataNames || line === this.lastLogged) {
      return;
    }
    this.lastLogged = line;
    console.log('[cardinality]', line);
  }

  private namesOf(value: unknown): string {
    if (Array.isArray(value)) {
      return value.map((item: CardinalityNodeComponent) => item.name).join(', ');
    }
    const one = value as CardinalityNodeComponent | undefined;
    return one?.name ?? '';
  }
}
