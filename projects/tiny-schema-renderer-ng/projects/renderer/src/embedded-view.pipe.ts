import {
  EmbeddedViewRef,
  Injector,
  Pipe,
  PipeTransform,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';

@Pipe({
  name: 'embeddedView',
  standalone: true,
})
export class EmbeddedViewPipe implements PipeTransform {
  private viewRef: EmbeddedViewRef<any> | null = null;
  private nodes: any[][] = [[]];
  transform(
    context: Record<string, any>,
    childrenTemplate: TemplateRef<any>,
    viewContainerRef: ViewContainerRef,
    options?: { index: number; injector?: Injector },
  ): any {
    if (!(context as any)?.children?.length) {
      return [[]];
    }
    if (this.viewRef) {
      Object.assign(this.viewRef.context, context);
      this.viewRef.detectChanges();
      return this.nodes;
    }
    this.viewRef = viewContainerRef.createEmbeddedView(childrenTemplate, context, options);
    this.nodes = [this.viewRef.rootNodes]; // 注意这里利用了先剪切锚点，初始化的元素自然会跟在锚点后，不可detectChanges
    return this.nodes;
  }
}

@Pipe({
  name: 'null2undefined',
  standalone: true,
})
export class Null2UndefinedPipe implements PipeTransform {
  transform(value: any): any {
    return value === null ? undefined : value;
  }
}