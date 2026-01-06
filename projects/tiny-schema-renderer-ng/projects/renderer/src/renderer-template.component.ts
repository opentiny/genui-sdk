import { Component, Injector, Pipe, PipeTransform, TemplateRef, Type, ViewChild, ViewContainerRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RendererContextService } from './context.service';

import { EmbeddedViewPipe } from './embedded-view.pipe';
import { LoopScopePipe } from './loop-scope.pipe';
import { AttrAndEventDirective } from './attr-and-event.directive';
import { PropsFilterPipe } from './props-filter.pipe';
import { GetDirectivesPipe } from './get-directive.pipe';
import { ComponentOutlet } from './component-outlet';
import { ParseDataPipe } from './parse-data.pipe';
import { MergeObjectPipe } from './merge-object.pipe';
import { AutoApplyDirectivesPipe } from './auto-apply-directives.pipe';
import { getComponent, getModuleRef } from './parser/material-getter';
import { RendererDirective } from './renderer.directive';

@Pipe({
  name: 'getModuleRef',
  standalone: true,
})
export class GetModuleRefPipe implements PipeTransform {
  transform(componentName: string): Type<any> | undefined {
    return componentName ? getModuleRef(componentName) : undefined;
  }
}

@Pipe({
  name: 'getComponent',
  standalone: true,
})
export class GetComponentPipe implements PipeTransform {
  transform(componentName: string): Type<any> | null {
    return componentName ? getComponent(componentName) : null;
  }
}

@Pipe({
  name: 'isArray',
  standalone: true,
})
export class IsArrayPipe implements PipeTransform {
  transform(value: any): boolean {
    return Array.isArray(value);
  }
}

@Pipe({
  name: 'isString',
  standalone: true,
})
export class IsStringPipe implements PipeTransform {
  transform(value: any): boolean { 
    return typeof value === 'string';
  }
}

@Component({
  selector: 'renderer-template',
  standalone: true,
  imports: [
    CommonModule,
    RendererDirective,  
    IsArrayPipe,
    IsStringPipe,
    GetComponentPipe,
    GetModuleRefPipe,
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
  templateUrl: './renderer-template.component.html',
  exportAs: 'rendererTemplate',
})
export class RendererTemplateComponent {
  @ViewChild('rendererTemplate', {static: true})
  public template!: TemplateRef<{
    schema: any;
    scope: any;
    parent: any;
    template: TemplateRef<any>;
    viewContainerRef: ViewContainerRef;
    injector: Injector | undefined;
  }>;
  constructor(private contextService: RendererContextService) {}

  get context() {
    return this.contextService.getContext();
  }
}
