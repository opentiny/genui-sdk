import { Component, forwardRef, Input } from '@angular/core';
import type { IMaterials } from '@opentiny/genui-sdk-core';
import {
  RENDERER_SETTINGS,
  type IRendererSettings,
  type NotifyHandler,
} from '@opentiny/tiny-schema-renderer-ng';
import { GENUI_MATERIALS } from './injection-tokens';

export type { NotifyHandler };

export interface GenuiConfigProviderProps {
  id?: string;
  materials?: IMaterials;
  notify?: NotifyHandler;
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
    {
      provide: RENDERER_SETTINGS,
      useFactory: (provider: GenuiConfigProvider) => provider.rendererSettings,
      deps: [forwardRef(() => GenuiConfigProvider)],
    },
  ],
})
export class GenuiConfigProvider {
  @Input() id = 'tiny-genui-config-provider';

  readonly materials: IMaterials = {};
  readonly rendererSettings: IRendererSettings = {};

  @Input('materials')
  set materialsInput(value: IMaterials | undefined) {
    Object.keys(this.materials).forEach((key) => delete (this.materials as Record<string, unknown>)[key]);
    Object.assign(this.materials, value ?? {});
  }

  @Input('notify')
  set notifyInput(value: NotifyHandler | undefined) {
    this.rendererSettings.notify = value;
  }
}
