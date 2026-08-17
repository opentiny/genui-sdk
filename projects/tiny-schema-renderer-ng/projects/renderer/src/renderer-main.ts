import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  Input,
  NgZone,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import { RENDERER_SETTINGS } from './renderer-settings';
import { RendererContextService } from './context.service';
import { parseData } from './parser/schema-parser';
import { getPageLifeCycleFns } from './life-cycles';
import { setPageCss } from './css/page-css';
import { CommonModule } from '@angular/common';
import { LoadingComponent } from './loading.component';
import { RendererTemplateComponent } from './renderer-template.component';
import { RendererDirective } from './renderer.directive';
import { ContentChildrenService } from './content-children';

function reset(obj: any) {
  Object.keys(obj).forEach((key) => delete obj[key]);
}

@Component({
  selector: 'tiny-schema-renderer',
  standalone: true,
  imports: [
    CommonModule,
    LoadingComponent,
    RendererTemplateComponent,
    RendererDirective,
  ],
  providers: [RendererContextService],
  template: `
    <ng-container *ngIf="pageSchema.children?.length">
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
    <pre *ngIf="outletTreeJson" (click)="logOutletTree()">{{ outletTreeJson }}</pre>
  `,
})
export class RendererMain implements OnDestroy {
  @Input() schema: any = {};
  pageSchema: any = {};
  methods: any = {};
  state: any = {};
  refs: Record<string, any> = {};
  cssScopeId: string = '';
  /** Debug snapshot — updated after CD so template binding stays stable (NG0100). */
  outletTreeJson = '';
  private pageOnUnmounted: (() => void | Promise<void>) | null = null;
  private readonly rendererSettings = inject(RENDERER_SETTINGS, { optional: true });
  private readonly contentChildrenService = inject(ContentChildrenService, { optional: true });

  constructor(
    private contextService: RendererContextService,
    private el: ElementRef,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
  ) {
    this.cssScopeId = `data-schema-${Math.random().toString(36).slice(2, 8)}`;
    this.contextService.setMaterials(this.rendererSettings?.materials ?? {});
  }

  ngAfterViewInit() {
    // TODO：export这些方法到custom element的方式待优化
    this.el.nativeElement.detectChanges = () => this.detectChanges();
    this.el.nativeElement.setContext = (context: any) => this.contextService.setContext(context);
    this.el.nativeElement.getContext = () => this.contextService.getContext();
    this.el.nativeElement.setState = (state: any) => this._setState(state);
    this.el.nativeElement.setRefs = (refs: any) => this.setRefs(refs);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['schema']) {
      this.setSchema(changes['schema'].currentValue);
    }
  }

  ngOnDestroy() {
    void this.invokePageOnUnmounted();
  }

  private async invokePageOnUnmounted() {
    const fn = this.pageOnUnmounted;
    this.pageOnUnmounted = null;
    if (typeof fn !== 'function') {
      return;
    }
    try {
      await fn();
    } catch (error) {
      console.error('RendererMain onUnmounted error:', error);
    }
  }

  get rootSchema() {
    return {
      componentName: 'div',
      children: this.pageSchema.children,
    };
  }

  public setContext(context: any) {
    this.contextService.setContext(context);
  }

  public getContext() {
    return this.contextService.getContext();
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

  public setState(state: any) {
    this._setState(state);
  }

  private _setState(data: any, clear: boolean = false) {
    clear && reset(this.state);
    if (!this.pageSchema.state) {
      this.pageSchema.state = data;
    }
    Object.assign(this.state, parseData(data, {}, this.contextService.getContext()) || {});
    this.contextService.setContext({
      state: this.state,
    });
  }

  public setRefs(refs: any) {
    this._setRefs(refs);
  }

  private _setRefs(data: any, clear: boolean = false) {
    clear && reset(this.refs);
    if (!this.pageSchema.refs) {
      this.pageSchema.refs = data;
    }
    Object.assign(this.refs, parseData(data, {}, this.contextService.getContext()) || {});
    this.contextService.setContext({
      refs: this.refs,
    });
  }

  private async setSchema(data: any) {
    if (!data || !Object.keys(data).length) {
      return;
    }
    const newSchema = JSON.parse(JSON.stringify(data));
    const context = {
      state: this.state,
      refs: this.refs,
      cssScopeId: this.cssScopeId,
    };
    this.contextService.setContext(context, true);
    this.setMethods(newSchema.methods || {}, true);
    this._setState(newSchema.state || {}, true);
    this._setRefs(newSchema.refs || {}, true);

    await this.invokePageOnUnmounted();

    const { onMounted: onMountedFn, onUnmounted: onUnmountedFn } = getPageLifeCycleFns(
      newSchema.lifeCycles,
      () => this.contextService.getContext(),
    );

    setPageCss(newSchema.css || '', this.cssScopeId);
    delete newSchema.lifeCycles;
    Object.assign(this.pageSchema, newSchema);

    await new Promise((resolve) => setTimeout(resolve, 0));

    try {
      // Create outlets (and sync props.ref) before page onMounted so this.refs.* is ready.
      this.ngZone.run(() => {
        this.cdr.detectChanges();
      });
      await onMountedFn?.();
      this.pageOnUnmounted = onUnmountedFn;
    } catch (error) {
      console.error('RendererMain onMounted error:', error);
    }
  }

  logOutletTree() {
    console.log('[content-children]', this.contentChildrenService?.serializeTree());
  }

  public detectChanges() {
    this.ngZone.run(() => {
      // 外部强行触发需要找ngZone空间里执行
      this.setSchema(this.schema);
    });
  }
}
