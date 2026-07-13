import { Component, forwardRef, Input, OnChanges, SimpleChanges, signal } from '@angular/core';
import { buildMaterialDefaultValueMap, type IMaterialsMeta, type MaterialDefaultValueMap } from '@opentiny/genui-sdk-core';
import type { IRendererMaterials } from '@opentiny/tiny-schema-renderer-ng';
import { GENUI_DEFAULT_PROPS_MAP, GENUI_MATERIALS } from '../injection-tokens';

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
      useFactory: (provider: GenuiConfigProvider) => provider.materialsState,
      deps: [forwardRef(() => GenuiConfigProvider)],
    },
    {
      provide: GENUI_DEFAULT_PROPS_MAP,
      useFactory: (provider: GenuiConfigProvider) => provider.defaultPropsMap,
      deps: [forwardRef(() => GenuiConfigProvider)],
    },
  ],
})
export class GenuiConfigProvider implements OnChanges {
  @Input() id = 'tiny-genui-config-provider';
  @Input() rendererConfig?: Partial<IMaterialsMeta>;
  @Input() materials?: IRendererMaterials;

  readonly defaultPropsMap: MaterialDefaultValueMap = {};
  readonly materialsState = signal<IRendererMaterials>({});

  constructor() {
    this.syncConfig();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['materials']) {
      this.materialsState.set(this.materials ?? {});
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
