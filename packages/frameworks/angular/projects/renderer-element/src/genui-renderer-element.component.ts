import { Component, inject, Input, Type } from '@angular/core';
import {
  GenuiConfigProvider,
  GenuiRenderer,
  GENUI_MATERIALS,
  type ICustomAction,
} from '@opentiny/genui-sdk-angular';

/**
 * Custom Element 入口：把 ConfigProvider 和 GenuiRenderer 组合在一起。
 *
 * 这样 theme / locale 只存在于 CE 包装层，公开的 GenuiRenderer API 保持干净。
 */
@Component({
  selector: 'genui-renderer-ng-element',
  standalone: true,
  imports: [GenuiConfigProvider, GenuiRenderer],
  template: `
    <genui-config-provider [materials]="materials" [theme]="theme" [locale]="locale">
      <genui-renderer
        [id]="id"
        [state]="state"
        [generating]="generating"
        [content]="content"
        [customDirectives]="customDirectives"
        [customDirectivesModule]="customDirectivesModule"
        [customComponents]="customComponents"
        [customComponentsModule]="customComponentsModule"
        [customActions]="customActions"
        [requiredCompleteFieldSelectors]="requiredCompleteFieldSelectors"
        [isJsonComplete]="isJsonComplete"
      ></genui-renderer>
    </genui-config-provider>
  `,
})
export class GenuiRendererElement {
  @Input() id?: string;
  @Input() theme?: string;
  @Input() locale?: string;
  @Input() state?: Record<string, any>;
  @Input() generating = false;
  @Input() content: string | object = '{}';
  @Input() customDirectives?: Record<string, Type<any>> = {};
  @Input() customDirectivesModule?: Record<string, Type<any>> = {};
  @Input() customComponents?: Record<string, Type<any>> = {};
  @Input() customComponentsModule?: Record<string, Type<any>> = {};
  @Input() customActions?: Record<string, ICustomAction> = {};
  @Input() requiredCompleteFieldSelectors?: string[];
  @Input() isJsonComplete?: boolean;

  readonly materials = inject(GENUI_MATERIALS);
}
