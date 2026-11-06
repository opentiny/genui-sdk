import {
  AfterViewInit,
  Component,
  ElementRef,
  forwardRef,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Optional,
  SimpleChanges,
  SkipSelf,
  Type,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import type {
  IMaterials,
  IMaterialsRuntime,
  MaterialsRuntimeFactory,
  MergedMaterials,
} from '@opentiny/genui-sdk-core';
import {
  RENDERER_SETTINGS,
  type IRendererSettings,
  type NotifyHandler,
} from '@opentiny/tiny-schema-renderer-ng';
import { GENUI_MATERIALS } from './injection-tokens';
import { GenuiRuntimeRootsRenderer, isAngularComponentType } from './runtime-roots';

export type { NotifyHandler };

export interface GenuiConfigProviderProps {
  id?: string;
  theme?: string;
  locale?: string;
  materials?: IMaterials;
  notify?: NotifyHandler;
}

/**
 * Angular 版的 ConfigProvider。
 *
 * 与 Vue 版一致，它负责把 theme / locale 交给物料声明的 runtimeFactory，
 * 并把 runtime 返回的 Angular root 组件按顺序嵌套在内容外层。
 */
@Component({
  selector: 'genui-config-provider',
  standalone: true,
  template: `
    <div #runtimeRootHost style="display: contents"></div>
    <div #runtimeContentSlot style="display: contents"><ng-content></ng-content></div>
  `,
  styles: [
    `
      :host {
        display: contents;
      }
    `,
  ],
  providers: [
    {
      provide: GENUI_MATERIALS,
      useFactory: (provider: GenuiConfigProvider) => provider.materials,
      deps: [forwardRef(() => GenuiConfigProvider)],
    },
    {
      provide: RENDERER_SETTINGS,
      useFactory: (provider: GenuiConfigProvider) => provider.rendererSettings,
      deps: [forwardRef(() => GenuiConfigProvider)],
    },
  ],
})
export class GenuiConfigProvider implements AfterViewInit, OnChanges, OnInit, OnDestroy {
  @Input() id = 'tiny-genui-config-provider';
  @Input() theme?: string;
  @Input() locale?: string;

  readonly materials: IMaterials = {};
  readonly rendererSettings: IRendererSettings = {};
  runtimeRoots: Type<unknown>[] = [];

  @ViewChild('runtimeRootHost', { read: ViewContainerRef, static: true })
  private runtimeRootHost?: ViewContainerRef;

  @ViewChild('runtimeContentSlot', { static: true })
  private runtimeContentSlot?: ElementRef<HTMLElement>;

  private readonly runtimeInstances = new Map<MaterialsRuntimeFactory, IMaterialsRuntime>();
  private runtimeRootsRenderer?: GenuiRuntimeRootsRenderer;
  private initialApplyDone = false;
  private mediaQuery?: MediaQueryList;

  // theme 为 auto 时，系统深浅色变化需要让物料重新解析一遍主题。
  private readonly handleSystemColorSchemeChange = () => {
    if ((this.theme ?? 'light') === 'auto') {
      this.applyRuntimes();
    }
  };

  constructor(
    @Optional() @SkipSelf() @Inject(GENUI_MATERIALS) parentMaterials: IMaterials | null,
    @Optional() @SkipSelf() @Inject(RENDERER_SETTINGS) parentSettings: IRendererSettings | null,
    private readonly hostRef: ElementRef<HTMLElement>,
  ) {
    // 未显式传入 materials / notify 时继承父级，避免嵌套 ConfigProvider 把上层配置清空。
    Object.assign(this.materials, parentMaterials ?? {});
    Object.assign(this.rendererSettings, parentSettings ?? {});
  }

  @Input('materials')
  set materialsInput(value: IMaterials | undefined) {
    Object.keys(this.materials).forEach((key) => delete (this.materials as Record<string, unknown>)[key]);
    Object.assign(this.materials, value ?? {});
    this.rendererSettings.materials = this.materials as IRendererSettings['materials'];
  }

  @Input('notify')
  set notifyInput(value: NotifyHandler | undefined) {
    this.rendererSettings.notify = value;
  }

  ngOnInit(): void {
    if (!this.initialApplyDone) {
      this.applyRuntimes();
    }
  }

  ngAfterViewInit(): void {
    if (!this.runtimeRootHost || !this.runtimeContentSlot) {
      return;
    }
    this.runtimeRootsRenderer = new GenuiRuntimeRootsRenderer(
      this.runtimeRootHost,
      this.runtimeContentSlot.nativeElement,
      this.hostRef.nativeElement,
    );
    this.runtimeRootsRenderer.render(this.runtimeRoots);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['theme'] || changes['locale'] || changes['materialsInput'] || changes['materials']) {
      this.applyRuntimes();
    }
  }

  ngOnDestroy(): void {
    this.runtimeRootsRenderer?.destroy();
    this.runtimeInstances.forEach((runtime) => runtime.dispose?.());
    this.runtimeInstances.clear();
    this.mediaQuery?.removeEventListener('change', this.handleSystemColorSchemeChange);
  }

  private resolveRuntimeFactories(): MaterialsRuntimeFactory[] {
    const runtimeFactory = (this.materials as MergedMaterials).runtimeFactory;
    if (!runtimeFactory) {
      return [];
    }
    return [...new Set(Array.isArray(runtimeFactory) ? runtimeFactory : [runtimeFactory])];
  }

  private syncRuntimeInstances(): MaterialsRuntimeFactory[] {
    const factories = this.resolveRuntimeFactories();

    for (const [factory, runtime] of this.runtimeInstances) {
      if (!factories.includes(factory)) {
        runtime.dispose?.();
        this.runtimeInstances.delete(factory);
      }
    }

    for (const factory of factories) {
      if (!this.runtimeInstances.has(factory)) {
        this.runtimeInstances.set(factory, factory());
      }
    }

    return factories;
  }

  private ensureMediaQuery(): void {
    if (this.mediaQuery || typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.mediaQuery.addEventListener('change', this.handleSystemColorSchemeChange);
  }

  private applyRuntimes(): void {
    this.initialApplyDone = true;
    // 未传 theme / locale 时保持上层配置不变，避免嵌套 renderer 把外层语言重置成默认值。
    if (this.theme === undefined && this.locale === undefined) {
      return;
    }

    this.ensureMediaQuery();
    const factories = this.syncRuntimeInstances();
    const config = {
      theme: this.theme ?? 'light',
      locale: this.locale ?? 'zh_CN',
    };
    const roots: Type<unknown>[] = [];

    for (const factory of factories) {
      const result = this.runtimeInstances.get(factory)?.apply(config);
      if (!result?.root) {
        continue;
      }
      if (isAngularComponentType(result.root)) {
        roots.push(result.root);
      } else {
        console.warn('[GenuiConfigProvider] root 不是 Angular 组件，已忽略:', result.root);
      }
    }

    this.runtimeRoots = roots;
    this.runtimeRootsRenderer?.render(this.runtimeRoots);
  }
}
