import { CommonModule } from '@angular/common';
import { Component, ContentChild, Input, OnInit, SimpleChanges, TemplateRef, Type, ViewChild } from '@angular/core';
import { DeltaPatcher, repairJson, RepairJsonState } from '@opentiny/genui-sdk-core';
import { RendererMain as Renderer, Mapper, directiveMap, ModuleRef } from '@opentiny/tiny-schema-renderer-ng';
import { requiredCompleteFieldSelectors } from './config';

export const CARD_ID = Symbol('schema-card-id');
export interface ICustomAction {
  execute: (params: any, context: Record<string, any>) => void;
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
  @Input() customActions?: Record<string, ICustomAction> = {};
  @Input() requiredCompleteFieldSelectors?: string[];
  public isError = false;
  protected deltaPatcher: DeltaPatcher | null = null;
  protected schema: any = {};
  protected updateContextAndStateTimer: any | null = null;

  get displaySchema() {
    if (this.isError) {
      return errorSchema;
    }
    return this.schema;
  }

  callAction(actionName: string, params: any) {
    if (!this.customActions?.[actionName]) {
      console.warn(`Action ${actionName} not found`);
    }
    this.customActions?.[actionName]?.execute(params, this.instance?.getContext() || {});
  }

  ngOnInit() {
    // TODO：待优化成provide inject
    this.deltaPatcher = new DeltaPatcher({
      requiredCompleteFieldSelectors: [
        ...requiredCompleteFieldSelectors,
        ...(this.requiredCompleteFieldSelectors || []),
      ]
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['content']) {
      this.processNewContent(changes['content'].currentValue);
      // keepUpdateContextAndState需要异步执行，否则setContext未成功会导致callAction报错
      Promise.resolve().then(() => {
        this.keepUpdateContextAndState();
      })
    }
    if (changes['customDirectives']) {
      this.customDirectives = changes['customDirectives'].currentValue;
      if (this.customDirectives) {
        this.updateCustomDirectives(this.customDirectives);
      }
    }
    if (changes['customComponents']) {
      this.customComponents = changes['customComponents'].currentValue;
      if (this.customComponents) {
        this.updateCustomComponents(this.customComponents);
      }
    }
    if (changes['customComponentsModule']) {
      this.customComponentsModule = changes['customComponentsModule'].currentValue;
      if (this.customComponentsModule) {
        this.updateCustomComponentsModule(this.customComponentsModule);
      }
    }
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

  protected updateCustomDirectives(customDirectives: Record<string, Type<any>>) {
    Object.keys(customDirectives).forEach(key => {
      directiveMap[key] = customDirectives[key];
    });
  }

  protected updateCustomComponents(customComponents: Record<string, Type<any>>) {
    Object.keys(customComponents).forEach(key => {
      Mapper[key] = customComponents[key];
    });
  }

  protected updateCustomComponentsModule(customComponentsModule: Record<string, Type<any>>) {
    Object.keys(customComponentsModule).forEach(key => {
      ModuleRef[key] = customComponentsModule[key];
    });
  }
}
