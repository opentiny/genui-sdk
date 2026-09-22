import {
  Directive,
  Input,
  OnChanges,
  OnDestroy,
  Self,
  SimpleChanges,
  TemplateRef,
} from '@angular/core';
import { SchemaRefBinding, getRefName } from './schema-ref-binding';

/**
 * Companion to schema `ng-template[ngSchemaTemplate]`: owns `props.ref` / `props.refName`
 * for template hosts — the registered value is the TemplateRef itself.
 * Component hosts are handled by {@link SchemaRefDirective}.
 *
 * - `props.ref` → page `this.refs`
 * - `props.refName` → `scope[refName] = value`
 */
@Directive({
  selector: 'ng-template[ngSchemaTemplate]',
  standalone: true,
})
export class SchemaRefTemplateDirective implements OnChanges, OnDestroy {
  /** Parsed schema ref props: only `{ ref?, refName? }` are populated. */
  @Input('schemaRefProps') props: Record<string, any> | null | undefined;
  /** Current render scope (page / loop mergeScope). */
  @Input('schemaRefScope') scope: Record<string, any> | null | undefined;

  private readonly binding = new SchemaRefBinding();

  constructor(@Self() private readonly templateRef: TemplateRef<unknown>) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['scope'] || changes['props']) {
      this.sync();
    }
  }

  ngOnDestroy() {
    this.binding.clear();
  }

  private sync() {
    this.binding.registerValue(this.templateRef, this.props ?? {}, {
      scope: this.scope,
      refName: getRefName(this.props),
    });
  }
}
