import type { ComponentType } from 'react';

export interface IRendererSettings {
  Function?: FunctionConstructor;
  transformJSX?: (code: string) => string;
  /** 外部注入的物料组件表，解耦具体 UI 库依赖 */
  materials?: Record<string, ComponentType<any>>;
}

const defaultMaterials: Record<string, ComponentType<any>> = {};

export const DEFAULT_RENDERER_SETTINGS: IRendererSettings = {
  Function: Function,
  materials: defaultMaterials,
};

let customSettings: IRendererSettings = {};

/**
 * 设置渲染器全局配置（Function、transformJSX、materials 等）。
 * 对齐 Vue tiny-schema-renderer 的 setCustomSettings。
 */
export function setCustomSettings(rendererSettings: IRendererSettings): void {
  customSettings = rendererSettings;
}

/**
 * 获取当前渲染器全局配置。
 * 对齐 Vue tiny-schema-renderer 的 getCustomSettings。
 */
export function getCustomSettings(): IRendererSettings {
  return customSettings || {};
}

/**
 * 获取 setCustomSettings / getCustomSettings，对齐 Vue useCustomSetting composable。
 */
export default function useCustomSetting(): {
  setCustomSettings: (rendererSettings: IRendererSettings) => void;
  getCustomSettings: () => IRendererSettings;
} {
  return {
    setCustomSettings,
    getCustomSettings,
  };
}
