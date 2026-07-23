import { Component, Input, Type } from '@angular/core';
import { materials as defaultMaterials } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/materials';
import { GenuiRenderer, type ICustomAction } from '../genui-renderer';
import { GENUI_MATERIALS } from '../config-provider/injection-tokens';

@Component({
  selector: 'genui-legacy-renderer',
  standalone: true,
  imports: [GenuiRenderer],
  providers: [{ provide: GENUI_MATERIALS, useValue: defaultMaterials }],
  template: `
    <genui-renderer
      [id]="id"
      [state]="state"
      [generating]="generating"
      [content]="content"
      [customDirectives]="customDirectives"
      [customComponents]="customComponents"
      [customComponentsModule]="customComponentsModule"
      [customActions]="customActions"
      [requiredCompleteFieldSelectors]="requiredCompleteFieldSelectors"
      [isJsonComplete]="isJsonComplete"
    >
      <ng-content></ng-content>
    </genui-renderer>
  `,
  styles: [
    `
      :host {
        display: contents;
      }
    `,
  ],
  exportAs: 'genuiLegacyRenderer',
})
export class GenuiLegacyRenderer {
  @Input() id?: string;
  @Input() state?: Record<string, any>;
  @Input() generating = false;
  @Input() content: string | object = '{}';
  @Input() customDirectives?: Record<string, Type<any>> = {};
  @Input() customComponents?: Record<string, Type<any>> = {};
  @Input() customComponentsModule?: Record<string, Type<any>> = {};
  @Input() customActions?: Record<string, ICustomAction> = {};
  @Input() requiredCompleteFieldSelectors?: string[];
  @Input() isJsonComplete?: boolean;
}
