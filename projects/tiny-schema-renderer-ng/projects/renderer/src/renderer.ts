import { Component, Input, SimpleChanges, Type, ViewContainerRef } from '@angular/core';
import { getComponent, getModuleRef } from './parser/material-getter';
import { parseData } from './parser/schema-parser';
import { CommonModule } from '@angular/common';
import { EmbeddedViewPipe } from './embedded-view.pipe';
import { AttrAndEventDirective } from './attr-and-event.directive';
import { RendererContextService } from './context.service';
import { LoopScopePipe } from './loop-scope.pipe';
import { PropsFilterPipe } from './props-filter.pipe';
import { ComponentOutlet } from './component-outlet';
import { GetDirectivesPipe } from './get-directive.pipe';
import { ParseDataPipe } from './parse-data.pipe';
import { MergeObjectPipe } from './merge-object.pipe';
import { AutoApplyDirectivesPipe } from './auto-apply-directives.pipe';
@Component({
  selector: 'schema-renderer',
  standalone: true,
  imports: [
    CommonModule,
    EmbeddedViewPipe,
    LoopScopePipe,
    AttrAndEventDirective,
    PropsFilterPipe,
    GetDirectivesPipe,
    ComponentOutlet,
    ParseDataPipe,
    MergeObjectPipe,
    AutoApplyDirectivesPipe,
  ],
  templateUrl: './renderer.component.html',
  styles: [
    `
      :host {
        display: contents;
      }
    `,
  ],
})
export class Renderer {
  @Input({ required: true }) schema: any;
  @Input() scope: Record<string, any> = {};
  @Input() parent: any = null;
  innerAttributes: Record<string, any> = {};

  constructor(
    private contextService: RendererContextService,
    public viewContainerRef: ViewContainerRef,
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['schema']) {
      this.innerAttributes = {
        [this.context['cssScopeId']]: '',
        'data-id': this.schema['id'] || null,
        'data-tag': this.componentName,
      }
      if (this.schema.props?.className) {
        this.innerAttributes['class'] = parseData(this.schema.props.className, this.scope, this.context);
      }
    }
  }

  get context() {
    return this.contextService.getContext();
  }
  get componentName() {
    return this.schema.componentName;
  }

  get loopArgs() {
    return this.schema.loopArgs;
  }

  get condition() {
    return this.schema.condition ?? true;
  }

  get loopList() {
    return parseData(this.schema.loop || {}, this.scope, this.context);
  }

  get children() {
    return this.schema.children;
  }

  get props() {
    return this.schema.props || {};
  }

  get directives() {
    return this.schema.directives;
  }

  get component(): Type<any> | null {
    return this.componentName ? getComponent(this.componentName) : null;
  }

  get moduleRef() {
    return this.componentName ? getModuleRef(this.componentName) : undefined;
  }


  isArray(value: any) {
    return Array.isArray(value);
  }

  isString(value: any) {
    return typeof value === 'string';
  }
}

export function renderDefault(schema: any, scope: any, parent: any) {
  return null;
}
