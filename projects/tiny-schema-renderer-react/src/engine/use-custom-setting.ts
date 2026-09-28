import type { InstanceMaterials } from '../materials';
import type { NotifyHandler } from './notify';

export type { NotifyHandler };

export interface IRendererSettings {
  Function?: FunctionConstructor;
  transformJSX?: (code: string) => string;
  materials?: InstanceMaterials;
  notify?: NotifyHandler;
}

export const DEFAULT_RENDERER_SETTINGS: IRendererSettings = {
  Function: Function,
  materials: {},
};

let customSettings: IRendererSettings = {};

export function setCustomSettings(rendererSettings: IRendererSettings): void {
  customSettings = rendererSettings;
}

export function getCustomSettings(): IRendererSettings {
  return customSettings || {};
}
