import { Inject, Injectable, Optional, SkipSelf } from '@angular/core';
import { type MaterialDefaultValueMap } from '@opentiny/genui-sdk-core';
import { RENDERER_SETTINGS, type IRendererSettings } from '@opentiny/tiny-schema-renderer-ng';
import { GENUI_DEFAULT_PROPS_MAP } from './injection-tokens';

@Injectable()
export class RendererSettingsService {
  constructor(
    @Optional() @SkipSelf() @Inject(RENDERER_SETTINGS) private parentSettings: IRendererSettings | null,
    @Optional() @Inject(GENUI_DEFAULT_PROPS_MAP) private defaultPropsMap: MaterialDefaultValueMap | null,
  ) {
  }

  getSettings(): IRendererSettings {
    return {
      ...(this.parentSettings ?? {}),
      defaultPropsMap: this.defaultPropsMap ?? this.parentSettings?.defaultPropsMap ?? {},
    };
  }
}
