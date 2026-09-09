import {
  Directive,
  EmbeddedViewRef,
  Input,
  SimpleChanges,
  TemplateRef,
  ViewContainerRef,
  Injector,
} from '@angular/core';
import { RendererContextService } from './context.service';

@Directive({
  selector: '[rendererTemplate]',
  standalone: true,
})
export class RendererDirective {
  @Input() schema: any;
  @Input() scope: any;
  @Input() parent: any;
  @Input() injector: Injector | undefined;
  @Input({ required: true }) template!: TemplateRef<{
    schema: any;
    scope: any;
    parent: any;
    template: TemplateRef<any>;
    viewContainerRef: ViewContainerRef;
    injector: Injector | undefined;
  }>;
  /**
   * Schema declaration order key for the rendered node (childIndex * STRIDE + loopIndex).
   * Exposed on the embedded-view context so descendant outlets register in schema order.
   */
  @Input() contentChildrenIndex?: number;

  public internalAttributes: Record<string, any> = {};
  private get templateContext() {
    return this;
  }
  private viewRef: EmbeddedViewRef<any> | null = null;

  constructor(
    public viewContainerRef: ViewContainerRef,
    public contextService: RendererContextService,
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    // `injector` is only consumed at createEmbeddedView time — recreate the view when it changes.
    if (changes['injector'] && this.viewRef) {
      this.viewRef.destroy();
      this.viewRef = null;
    }

    if (changes['schema']) {
      this.internalAttributes = {
        [this.contextService.getContext()['cssScopeId']]: '',
        'data-id': this.schema['id'] || null,
        'data-tag': this.schema['componentName'],
      };
    }

    // Re-render on any input that feeds the template. Notably `contentChildrenIndex` changes
    // when a parent `@for` reorders siblings — without this the embedded-view context keeps a
    // stale index and descendant content queries sort in the wrong (pre-reorder) order.
    const needsRender =
      changes['schema'] ||
      changes['scope'] ||
      changes['parent'] ||
      changes['contentChildrenIndex'] ||
      changes['injector'];
    if (!needsRender) {
      return;
    }

    if (this.viewRef) {
      Object.assign(this.viewRef.context, this.templateContext);
      this.viewRef.detectChanges();
    } else if (this.schema != null) {
      this.viewRef = this.viewContainerRef.createEmbeddedView(
        this.template,
        this.templateContext,
        this.injector ? { injector: this.injector } : undefined,
      );
      this.viewRef.detectChanges();
    }
  }
}
