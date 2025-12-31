import { Component, ElementRef, Input, NgZone, SimpleChanges } from '@angular/core';
// import { Renderer } from './renderer';
import { RendererContextService } from './context.service';
import { parseData } from './parser/schema-parser';
import { setPageCss } from './css/page-css';
import { CommonModule } from '@angular/common';
import { LoadingComponent } from './loading.component';
import { RendererTemplateComponent } from './renderer-template.component';
import { RendererDirective } from './renderer.directive';

function reset(obj: any) {
  Object.keys(obj).forEach((key) => delete obj[key]);
};

@Component({
  selector: 'tiny-schema-renderer',
  standalone: true,
  imports: [
    CommonModule,
    // Renderer,
    LoadingComponent,
    RendererTemplateComponent,
    RendererDirective,
  ],
  providers: [RendererContextService],
  template: `
    <ng-container *ngIf="pageSchema.children?.length">
      <!-- <schema-renderer [schema]="rootSchema" [parent]="pageSchema"></schema-renderer> -->
      <renderer-template #rendererTemplateComponent></renderer-template>
      <ng-template
        rendererTemplate
        [schema]="rootSchema"
        [scope]="{}"
        [parent]="pageSchema"
        [template]="rendererTemplateComponent.template"
      ></ng-template>
    </ng-container>
    <ng-container *ngIf="!pageSchema.children?.length">
      <div loading></div>
    </ng-container>
  `,
})
export class RendererMain {
  @Input() schema: any = {};
  pageSchema: any = {};
  methods: any = {};
  state: any = {};
  cssScopeId: string = '';
  constructor(
    private contextService: RendererContextService,
    private el: ElementRef,
    private ngZone: NgZone,
  ) {
    this.cssScopeId = `data-schema-${Math.random().toString(36).slice(2, 8)}`;
  }

  ngAfterViewInit() {
    // TODO：export这些方法到custom element的方式待优化
    this.el.nativeElement.detectChanges = () => this.detectChanges();
    this.el.nativeElement.setContext = (context: any) => this.contextService.setContext(context);
    this.el.nativeElement.getContext = () => this.contextService.getContext()
    this.el.nativeElement.setState = (state: any) => this.setState(state);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['schema']) {
      this.setSchema(changes['schema'].currentValue);
    }
  }

  get rootSchema() {
    return {
      componentName: 'div',
      children: this.pageSchema.children,
    };
  }

  private setMethods(data: any, clear: boolean = false) {
    clear && reset(this.methods);
    // 这里有些方法在画布还是有执行的必要的，比如说表格的renderer和formatText方法，包括一些自定义渲染函数
    Object.assign(
      this.methods,
      Object.fromEntries(
        Object.keys(data).map((key) => {
          return [key, parseData(data[key], {}, this.contextService.getContext())];
        }),
      ),
    );
    this.contextService.setContext(this.methods);
  }

  private setState(data: any, clear: boolean = false) {
    clear && reset(this.state);
    if (!this.pageSchema.state) {
      this.pageSchema.state = data;
    }
    Object.assign(this.state, parseData(data, {}, this.contextService.getContext()) || {});
    this.contextService.setContext({
      state: this.state,
    });
  }

  private async setSchema(data: any) {
    if (!data || !Object.keys(data).length) {
      return;
    }
    const newSchema = JSON.parse(JSON.stringify(data));
    const context = {
      state: this.state,
      cssScopeId: this.cssScopeId,
    };
    this.contextService.setContext(context, true);
    this.setMethods(newSchema.methods || {}, true);
    this.setState(newSchema.state || {}, true);
    Object.assign(this.pageSchema, newSchema);
    await new Promise((resolve) => setTimeout(resolve, 0));
    setPageCss(newSchema.css || '', this.cssScopeId);
  }

  public detectChanges() {
    this.ngZone.run(() => {
      // 外部强行触发需要找ngZone空间里执行
      this.setSchema(this.schema);
    });
  }
}
