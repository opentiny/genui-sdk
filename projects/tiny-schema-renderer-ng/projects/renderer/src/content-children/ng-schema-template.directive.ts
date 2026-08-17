import {
  Directive,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  TemplateRef,
  inject,
} from '@angular/core';
import { ComponentOutlet } from '../component-outlet';
import {
  registerProjectedTemplate,
  unregisterProjectedTemplate,
} from './content-children-patch';

/**
 * Marks a real `<ng-template>` produced by schema `componentName: 'NgTemplate'`.
 * Registers the TemplateRef on the parent {@link ComponentOutlet} so content-children
 * patch can satisfy `@ContentChild(TemplateRef)` / `contentChild(TemplateRef)`.
 */
@Directive({
  selector: 'ng-template[ngSchemaTemplate]',
  standalone: true,
})
export class NgSchemaTemplateDirective implements OnInit, OnChanges, OnDestroy {
  private readonly templateRef = inject(TemplateRef<unknown>);

  /**
   * Parent material outlet that projects this template (ListItem's ComponentOutlet, etc.).
   * Passed explicitly — projected views may not see CONTENT_CHILDREN_OUTLET via DI.
   */
  @Input({ required: true }) ngSchemaTemplateParent!: ComponentOutlet;

  /** Optional schema.refName — matches contentChild('name') returning this TemplateRef. */
  @Input() ngSchemaTemplateRefName: string | null | undefined;

  ngOnInit() {
    this.syncRegistration();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['ngSchemaTemplateParent'] || changes['ngSchemaTemplateRefName']) {
      if (!changes['ngSchemaTemplateParent']?.firstChange) {
        const prevParent = changes['ngSchemaTemplateParent']?.previousValue as
          | ComponentOutlet
          | undefined;
        if (prevParent) {
          unregisterProjectedTemplate(prevParent, this.templateRef);
        }
      }
      this.syncRegistration();
    }
  }

  ngOnDestroy() {
    if (this.ngSchemaTemplateParent) {
      unregisterProjectedTemplate(this.ngSchemaTemplateParent, this.templateRef);
    }
  }

  private syncRegistration() {
    if (!this.ngSchemaTemplateParent) {
      return;
    }
    registerProjectedTemplate(
      this.ngSchemaTemplateParent,
      this.templateRef,
      this.ngSchemaTemplateRefName,
    );
  }
}
