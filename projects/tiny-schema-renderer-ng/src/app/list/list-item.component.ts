import { Component, ContentChild, Input, TemplateRef, contentChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'app-list-item',
  exportAs: 'listItem',
  standalone: true,
  imports: [NgTemplateOutlet],
  template: `
    <li class="demo-list-item">
      @if (namedHeader(); as header) {
        <div class="demo-list-item__header">
          <ng-container *ngTemplateOutlet="header; context: { label: label + ' (header)', $implicit: { hello: 'header' }, index: 100000 }"></ng-container>
        </div>
      }
      @if (activeTemplate) {
        <ng-container *ngTemplateOutlet="activeTemplate; context: { label: label, $implicit: { hello: 'world' }, index: 100000 }"></ng-container>
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
      .demo-list-item__header {
        border-bottom: 1px dashed #c7d2fe;
        margin-bottom: 4px;
        padding-bottom: 4px;
        background: #eef2ff;
      }
    `,
  ],
})
export class ListItemComponent {
  /** Type selector — any projected TemplateRef (NgTemplate without preferring a name). */
  @ContentChild(TemplateRef) templateRef?: TemplateRef<any>;

  /** String selector — matches schema NgTemplate with `"props": { "refName": "itemBody" }`. */
  readonly namedBody = contentChild<TemplateRef<any>>('itemBody');

  /** String selector — matches schema NgTemplate with `"props": { "refName": "listHeaderSlot" }`. */
  readonly namedHeader = contentChild<TemplateRef<any>>('listHeaderSlot');

  @Input() label = '';

  /** Prefer named ref; fall back to @ContentChild(TemplateRef). */
  get activeTemplate(): TemplateRef<any> | undefined {
    return this.namedBody() ?? this.templateRef;
  }
}
