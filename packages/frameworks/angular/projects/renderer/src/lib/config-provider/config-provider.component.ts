import { Component, forwardRef, Input } from '@angular/core';
import type { IMaterials } from '@opentiny/genui-sdk-core';
import { GENUI_MATERIALS } from './injection-tokens';

export interface GenuiConfigProviderProps {
  id?: string;
  materials?: IMaterials;
}

@Component({
  selector: 'genui-config-provider',
  standalone: true,
  template: '<ng-content></ng-content>',
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
  ],
})
export class GenuiConfigProvider {
  @Input() id = 'tiny-genui-config-provider';

  readonly materials: IMaterials = {};

  @Input('materials')
  set materialsInput(value: IMaterials | undefined) {
    Object.keys(this.materials).forEach((key) => delete (this.materials as Record<string, unknown>)[key]);
    Object.assign(this.materials, value ?? {});
  }
}
