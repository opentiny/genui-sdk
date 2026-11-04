import { Component, Input, Type } from '@angular/core';
import {
  GenuiConfigProvider,
  GenuiRenderer,
  type ICustomAction,
} from '@opentiny/genui-sdk-angular';
import { mergeMaterials, type IMaterials } from '@opentiny/genui-sdk-core';
import { materials as tinyNgMaterials } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/materials';
import { proMaterials as angularMaterialMaterials } from '@opentiny/genui-sdk-materials-angular-angular-material/materials';

const activeMaterials = mergeMaterials(tinyNgMaterials, angularMaterialMaterials) as IMaterials;

@Component({
  selector: 'genui-renderer-element-host',
  standalone: true,
  imports: [GenuiConfigProvider, GenuiRenderer],
  template: `
    <genui-config-provider [materials]="activeMaterials">
      <genui-renderer
        [id]="id"
        [state]="state"
        [generating]="generating"
        [content]="content"
        [customDirectives]="customDirectives"
        [customComponents]="customComponents"
        [customComponentsModule]="customComponentsModule"
        [customActions]="customActions"
        [requiredCompleteFieldSelectors]="completeFieldSelectors"
        [isJsonComplete]="isJsonComplete"
      />
    </genui-config-provider>
  `,
})
export class GenuiRendererElementHost {
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

  protected readonly activeMaterials = activeMaterials;

  protected get completeFieldSelectors(): string[] {
    const fromMaterials = this.activeMaterials.requiredCompleteFieldSelectors ?? [];
    const extra = this.requiredCompleteFieldSelectors ?? [];
    if (!extra.length) {
      return fromMaterials;
    }
    return [...fromMaterials, ...extra];
  }
}
