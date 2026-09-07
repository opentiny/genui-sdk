import type { InstanceMaterials } from '../materials';

export interface IRendererSettings {
  Function?: FunctionConstructor;
  transformJSX?: (code: string) => string;
  materials?: InstanceMaterials;
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

export default function useCustomSetting(): {
  setCustomSettings: (rendererSettings: IRendererSettings) => void;
  getCustomSettings: () => IRendererSettings;
} {
  return {
    setCustomSettings,
    getCustomSettings,
  };
}
