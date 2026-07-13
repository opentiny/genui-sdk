import { InjectionToken } from '@angular/core';

type DefaultValueMap = Record<string, unknown>;

export type DefaultPropsMap = Record<string, DefaultValueMap>;

export interface IRendererSettings {
  defaultPropsMap?: DefaultPropsMap;
}

export const RENDERER_SETTINGS = new InjectionToken<IRendererSettings>('RENDERER_SETTINGS');
