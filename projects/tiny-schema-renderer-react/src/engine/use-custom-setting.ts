import type { ComponentType } from 'react';
import type { DefaultPropsMap } from './apply-default-props';

export interface IRendererSettings {
  Function?: FunctionConstructor;
  transformJSX?: (code: string) => string;
  materials?: Record<string, ComponentType<any>>;
  defaultPropsMap?: DefaultPropsMap;
}

const defaultMaterials: Record<string, ComponentType<any>> = {};

export const DEFAULT_RENDERER_SETTINGS: IRendererSettings = {
  Function: Function,
  materials: defaultMaterials,
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
