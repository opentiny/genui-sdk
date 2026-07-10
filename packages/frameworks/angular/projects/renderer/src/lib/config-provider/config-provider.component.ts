import { Component, forwardRef, Input, OnChanges, SimpleChanges } from '@angular/core';
import { buildMaterialDefaultValueMap, type IRendererConfig, type MaterialDefaultValueMap } from '@opentiny/genui-sdk-core';
import type { IRendererMaterials } from '@opentiny/tiny-schema-renderer-ng';
import { GENUI_CONFIG, GENUI_DEFAULT_PROPS_MAP } from '../injection-tokens';
import { GenuiConfigStore } from './config-store';

export interface GenuiConfigProviderProps {
  id?: string;
  rendererConfig?: Partial<IRendererConfig>;
  materials?: IRendererMaterials;
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
    GenuiConfigStore,
    { provide: GENUI_CONFIG, useExisting: GenuiConfigStore },
    {
      provide: GENUI_DEFAULT_PROPS_MAP,
      useFactory: (provider: GenuiConfigProvider) => provider.defaultPropsMap,
      deps: [forwardRef(() => GenuiConfigProvider)],
    },
  ],
})
export class GenuiConfigProvider implements OnChanges {
  @Input() id = 'tiny-genui-config-provider';
  @Input() rendererConfig?: Partial<IRendererConfig>;
  @Input() materials?: IRendererMaterials;

  readonly defaultPropsMap: MaterialDefaultValueMap = {};

  constructor(private readonly configStore: GenuiConfigStore) {
    this.syncConfig();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['materials']) {
      this.configStore.setMaterials(this.materials);
    }
    if (changes['rendererConfig']) {
      this.syncConfig();
    }
  }

  private syncConfig(): void {
    const newMap = buildMaterialDefaultValueMap(this.rendererConfig ?? {});
    Object.keys(this.defaultPropsMap).forEach((key) => delete this.defaultPropsMap[key]);
    Object.assign(this.defaultPropsMap, newMap);
  }
}
