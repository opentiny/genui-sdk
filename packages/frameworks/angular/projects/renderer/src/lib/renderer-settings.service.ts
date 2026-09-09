import { Inject, Injectable, Optional, SkipSelf } from '@angular/core';
import type { IMaterials } from '@opentiny/genui-sdk-core';
import {
  RENDERER_SETTINGS,
  type IRendererMaterials,
  type IRendererSettings,
} from '@opentiny/tiny-schema-renderer-ng';
import { GENUI_MATERIALS } from './config-provider/injection-tokens';

@Injectable()
export class RendererSettingsService {
  readonly settings: IRendererSettings;

  constructor(
    @Optional() @SkipSelf() @Inject(RENDERER_SETTINGS) private parentSettings: IRendererSettings | null,
    @Optional() @Inject(GENUI_MATERIALS) private materials: IMaterials | null,
  ) {
    this.settings = this.parentSettings ?? {};
    this.syncFromParent();
  }

  syncFromParent(): IRendererSettings {
    this.settings.materials = (this.materials ?? this.parentSettings?.materials ?? {}) as IRendererMaterials;
    return this.settings;
  }
}
