import { CommonModule } from '@angular/common';
import { Component, ContentChild, effect, inject, Input, OnInit, SimpleChanges, TemplateRef, Type, untracked, ViewChild } from '@angular/core';
import { DeltaPatcher, repairJson, RepairJsonState } from '@opentiny/genui-sdk-core';
import { RendererMain as Renderer, RENDERER_SETTINGS, type IRendererMaterials } from '@opentiny/tiny-schema-renderer-ng';
import { requiredCompleteFieldSelectors } from './config';
import { GENUI_CONFIG } from './injection-tokens';
import { GenuiConfigStore } from './config-provider';
import { mergeMaterials, collectCustomMaterials } from './merge-materials';
import { RendererSettingsService } from './renderer-settings.service';

export const CARD_ID = Symbol('schema-card-id');
export interface ICustomAction {
  execute: (params: any, context: Record<string, any>) => any;
  [key: string]: any;
}

const errorSchema = {
  componentName: 'Page',
  children: [
    {
      componentName: 'Text',
      props: { text: 'An error occurred while rendering the schema', style: 'line-height: 40px; color: red' },
    },
  ],
};

@Component({
  selector: 'genui-renderer',
  standalone: true,
  imports: [
    CommonModule,
    Renderer,
  ],
  providers: [
    RendererSettingsService,
    {
      provide: RENDERER_SETTINGS,
      useFactory: (rss: RendererSettingsService) => rss.getSettings(),
      deps: [RendererSettingsService],
    },
  ],
  templateUrl: './genui-renderer.html',
  styleUrls: ['./genui-renderer.css'],
  exportAs: 'genuiRenderer',
})
export class GenuiRenderer implements OnInit {
  @ViewChild('rendererInstance', { read: Renderer }) instance?: Renderer;
  @ContentChild('header') headerTemplate?: TemplateRef<any>;
  @ContentChild('footer') footerTemplate?: TemplateRef<any>;
  @Input() id?: string;
  @Input() state?: Record<string, any>;
  @Input() generating = false;
  @Input() content: string | object = '{}';
  @Input() customDirectives?: Record<string, Type<any>> = {};
  @Input() customComponents?: Record<string, Type<any>> = {};
  @Input() customComponentsModule?: Record<string, Type<any>> = {};
  @Input() materials?: IRendererMaterials;
  @Input() customActions?: Record<string, ICustomAction> = {};
  @Input() requiredCompleteFieldSelectors?: string[];
  @Input() isJsonComplete?: boolean;
  public isError = false;
  protected deltaPatcher: DeltaPatcher | null = null;
  protected schema: any = {};
  protected updateContextAndStateTimer: any | null = null;
  protected resolvedMaterials: IRendererMaterials = {};

  private readonly configStore = inject<GenuiConfigStore>(GENUI_CONFIG, { optional: true });

  constructor() {
    effect(() => {
      if (!this.configStore) {
        return;
      }
      this.configStore.materials();
      untracked(() => this.resolveMaterials());
    });
  }

  get displaySchema() {
    if (this.isError) {
      return errorSchema;
    }
    return this.schema;
  }

  callAction(actionName: string, params: any) {
    if (!this.customActions?.[actionName]) {
      console.warn(`Action ${actionName} not found`);
      return;
    }
    return this.customActions[actionName]?.execute(params, this.instance?.getContext() || {});
  }

  ngOnInit() {
    // TODO：待优化成provide inject
    this.deltaPatcher = new DeltaPatcher({
      requiredCompleteFieldSelectors: [
        ...requiredCompleteFieldSelectors,
        ...(this.requiredCompleteFieldSelectors || []),
      ]
    });
    this.resolveMaterials();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['content'] || changes['isJsonComplete']) {
      this.processNewContent(changes['content'].currentValue);
      // 异步等待渲染器初始化context后再设置
      Promise.resolve().then(() => {
        this.keepUpdateContextAndState();
      })
    }
    if (changes['customDirectives'] || changes['customComponents'] || changes['customComponentsModule'] || changes['materials']) {
      this.resolveMaterials();
    }
  }

  /**
   * 合并物料来源并透传给底层渲染器。
   * 优先级（后者覆盖前者）：ConfigProvider 物料包 → [materials] → custom* 扩展。
   */
  protected resolveMaterials(): void {
    this.resolvedMaterials = mergeMaterials(
      this.configStore?.materials(),
      this.materials,
      collectCustomMaterials({
        customComponents: this.customComponents,
        customComponentsModule: this.customComponentsModule,
        customDirectives: this.customDirectives,
      }),
    );
  }

  protected processNewContent(newVal: string | object) {
    this.isError = false;
    let json: any = newVal;
    let isCompleted = true
    if (typeof newVal === 'string') {
      if (newVal.trim()) {
        const { value, state } = repairJson(newVal);
        if (!value) {
          this.isError = true;
          return;
        }
        json = value;
        isCompleted = state === RepairJsonState.SUCCESS;
      } else {
        json = {};
      }
    } else {
      isCompleted = this.isJsonComplete ?? true;
    }
    if (!isCompleted && json && 'lifeCycles' in json) {
      const { lifeCycles: _lifeCycles, ...rest } = json;
      json = rest;
    }
    if (this.deltaPatcher) {
      this.deltaPatcher.patchWithDelta(this.schema, json, isCompleted);
    } else {
      this.schema = json;
    }
    this.instance?.detectChanges();
  }

  protected keepUpdateContextAndState() {
    if (this.instance) {
      if (!this.updateContextAndStateTimer) {
        this.updateContextAndStateTimer = setTimeout(() => {
          this.updateContextAndState();
          this.updateContextAndStateTimer = null;
        }, 0);
      }
    }
  }

  updateContextAndState() {
    this.instance?.setContext({
      callAction: this.callAction.bind(this),
    });
    if (this.id) {
      this.instance?.setContext({
        [CARD_ID]: this.id,
      });
    }
    this.instance?.setState(this.state);
  }
}
