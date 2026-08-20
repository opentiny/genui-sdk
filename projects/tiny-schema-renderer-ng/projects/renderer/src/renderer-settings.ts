import { InjectionToken } from '@angular/core';
import type { IRendererMaterials } from './renderer-materials';

export interface IRendererSettings {
  materials?: IRendererMaterials;
}

export const RENDERER_SETTINGS = new InjectionToken<IRendererSettings>('RENDERER_SETTINGS');
