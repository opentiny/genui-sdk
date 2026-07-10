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

/**
 * Schema 渲染入口指令。
 * 通过 createEmbeddedView 驱动 renderer-template 模板，子节点递归挂载同一指令。
 */
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

  public internalAttributes: Record<string, any> = {};
  private get templateContext(){
    return this;
  }
  private viewRef: EmbeddedViewRef<any> | null = null;

  constructor(public viewContainerRef: ViewContainerRef, public contextService: RendererContextService) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['schema']) {
      if (this.viewRef) {
        Object.assign(this.viewRef.context, this.templateContext);
        this.viewRef.detectChanges();
      } else {
        this.viewRef = this.viewContainerRef.createEmbeddedView(this.template, this.templateContext);
        this.viewRef.detectChanges();
      }

      this.internalAttributes = {
        [this.contextService.getContext()['cssScopeId']]: '',
        'data-id': this.schema['id'] || null,
        'data-tag': this.schema['componentName'],
      }
    }
  }
}

