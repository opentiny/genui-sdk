import { Component, ContentChild, Input, TemplateRef, contentChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'app-list-item',
  exportAs: 'listItem',
  standalone: true,
  imports: [NgTemplateOutlet],
  template: `
    <li class="demo-list-item">
      @if (activeTemplate) {
        <ng-container *ngTemplateOutlet="activeTemplate; context: { label: label, $implicit: { hello: 'world' } }"></ng-container>
      } @else {
        <ng-content></ng-content>
        @if (label) {
          <span>{{ label }}</span>
        }
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
  /** Type selector — any projected TemplateRef (NgTemplate without preferring a name). */
  @ContentChild(TemplateRef) templateRef?: TemplateRef<any>;

  /** String selector — matches schema NgTemplate with `"props": { "refName": "itemBody" }`. */
  readonly namedBody = contentChild<TemplateRef<any>>('itemBody');

  @Input() label = '';

  /** Prefer named ref; fall back to @ContentChild(TemplateRef). */
  get activeTemplate(): TemplateRef<any> | undefined {
    return this.namedBody() ?? this.templateRef;
  }
}
