import { InjectionToken } from '@angular/core';
import type { IRendererMaterials } from './renderer-materials';

export type NotifyType = 'success' | 'warning' | 'error' | 'info';

export interface NotifyOptions {
  type?: NotifyType;
  title?: string;
  message?: string;
  duration?: number;
}

export type NotifyHandler = (options: NotifyOptions) => void;

export interface IRendererSettings {
  materials?: IRendererMaterials;
  notify?: NotifyHandler;
}

export const RENDERER_SETTINGS = new InjectionToken<IRendererSettings>('RENDERER_SETTINGS');

export const NOTIFY_CONTEXT_KEY = Symbol('renderer-notify');
