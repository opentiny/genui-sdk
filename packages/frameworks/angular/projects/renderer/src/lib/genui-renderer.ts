import { CommonModule } from '@angular/common';
import { Component, ContentChild, ElementRef, Input, OnInit, SimpleChanges, TemplateRef, Type, ViewChild } from '@angular/core';
import { DeltaPatcher } from '@opentiny/genui-sdk-core';
import { parsePartialJson } from 'ai';
import { RendererMain as Renderer } from '@opentiny/tiny-schema-renderer-ng';
import { requiredCompleteFieldSelectors } from './config';
export const CARD_ID = Symbol('schema-card-id');
export interface IRendererProps {
  content: string | object;
  customComponents?: Record<string, Component>;
  customActions?: any;
  requiredCompleteFieldSelectors?: string[];
}

export interface ICustomAction {
  execute: (params: any) => void;
  [key: string]: any;
}

const errorSchema = {
  componentName: 'Page',
  children: [
    {
      componentName: 'Text',
      props: { text: 'An error occurred while rendering the schema', style: 'line-height: 40px; color: var(--tv-color-error-text)' },
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
})
export class GenuiRenderer implements OnInit {
  @ViewChild('rendererInstance', {read: Renderer}) instance?: Renderer;
  @ContentChild('header') headerTemplate?: TemplateRef<any>;
  @ContentChild('footer') footerTemplate?: TemplateRef<any>;
  @Input() id?: string;
  @Input() state?: Record<string, any>;
  @Input() generating = false;
  @Input() content: string | object = '{} ';
  @Input() customComponents?: Record<string, Type<any>> = {};
  @Input() customComponentsModule?: Record<string, Type<any>> = {};
  @Input() customActions?: Record<string, ICustomAction> = {};
  @Input() requiredCompleteFieldSelectors?: string[];
  private deltaPatcher: DeltaPatcher | null = null;
  public isError = false;
  public schema: any = {};
  private updateContextAndStateTimer: any | null = null;

  get displaySchema() {
    if (this.isError) {
      return errorSchema;
    }
    return this.schema;
  }

  constructor() {}
  callAction(actionName: string, params: any) {
    if (!this.customActions?.[actionName]) {
      console.warn(`Action ${actionName} not found`);
    }
    this.customActions?.[actionName]?.execute(params);
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
      this.processNewContent(changes['content'].currentValue).then(() => {
        this.keepUpdateContextAndState();
      });
    }
  }

  async processNewContent(newVal: string | object) {
    let json: any = newVal;
    let isCompleted = true
    if (typeof newVal === 'string' && newVal) {
      const { value, state } = await parsePartialJson(newVal);
      if (!value) {
        this.isError = true;
        return;
      }
      json = value;
      isCompleted = state === 'successful-parse'
    }
    this.deltaPatcher?.patchWithDelta(this.schema, json, isCompleted);
    this.instance?.detectChanges();
  }

  keepUpdateContextAndState() {
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
