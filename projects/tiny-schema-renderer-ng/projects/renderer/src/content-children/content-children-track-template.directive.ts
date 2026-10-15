import {
  Directive,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  TemplateRef,
} from '@angular/core';
import { ComponentOutlet } from '../component-outlet';
import { registerContentRef, unregisterContentRef } from './content-children-patch';

/**
 * Tracks schema `NgTemplate` nodes: registers a `kind: 'template'` content-ref entry
 * under the parent outlet so `contentChild('name')` / `@ContentChild(TemplateRef)`
 * resolve it — the template counterpart of {@link ContentChildrenTrackDirective}.
 * Ref-value semantics (`props.ref`/`props.refName`) belong to {@link SchemaRefTemplateDirective}.
 */
@Directive({
  selector: 'ng-template[ngSchemaTemplate]',
  standalone: true,
})
export class ContentChildrenTrackTemplateDirective implements OnInit, OnChanges, OnDestroy {
  /** Parent outlet that projects this template (registration target). */
  @Input({ required: true }) contentChildrenParent!: ComponentOutlet;

  /** Schema `props.refName` — string selector for `contentChild('name')`. */
  @Input() contentChildrenRefName: string | null | undefined;

  /** Schema declaration order key (`childIndex * STRIDE`). */
  @Input() contentChildrenIndex?: number;

  constructor(private readonly templateRef: TemplateRef<unknown>) {}

  ngOnInit() {
    this.syncRegistration();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (
      changes['contentChildrenParent'] ||
      changes['contentChildrenRefName'] ||
      changes['contentChildrenIndex']
    ) {
      if (!changes['contentChildrenParent']?.firstChange) {
        const prevParent = changes['contentChildrenParent']?.previousValue as
          | ComponentOutlet
          | undefined;
        if (prevParent) {
          unregisterContentRef(prevParent, {
            kind: 'template',
            templateRef: this.templateRef,
            refName: null,
          });
        }
      }
      this.syncRegistration();
    }
  }

  ngOnDestroy() {
    unregisterContentRef(this.contentChildrenParent, {
      kind: 'template',
      templateRef: this.templateRef,
      refName: null,
    });
  }

  private syncRegistration() {
    if (!this.contentChildrenParent) {
      return;
    }
    registerContentRef(this.contentChildrenParent, {
      kind: 'template',
      templateRef: this.templateRef,
      refName: this.contentChildrenRefName ?? null,
      index: this.contentChildrenIndex,
    });
  }
}
