import type { ReactNode } from 'react';
import type { IRendererSettings } from './engine';
import { setCustomSettings } from './engine';

export interface RendererContextProviderProps {
  children: ReactNode;
  /** 渲染器全局配置（materials、Function 等），对齐 Vue RENDERER_SETTINGS_KEY inject */
  'render-settings'?: IRendererSettings;
}

/**
 * 注入渲染器 settings（物料、Function 等），不参与 pageContext 管理。
 */
export function RendererContextProvider({
  children,
  'render-settings': renderSettings,
}: RendererContextProviderProps) {
  if (renderSettings) {
    setCustomSettings(renderSettings);
  }

  return children;
}
