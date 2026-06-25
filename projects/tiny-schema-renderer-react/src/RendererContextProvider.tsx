import type { ReactNode } from 'react';
import type { IRendererSettings } from './engine';
import { setCustomSettings } from './engine';

export interface RendererContextProviderProps {
  children: ReactNode;
  'render-settings'?: IRendererSettings;
}

export function RendererContextProvider({
  children,
  'render-settings': renderSettings,
}: RendererContextProviderProps) {
  if (renderSettings) {
    setCustomSettings(renderSettings);
  }

  return children;
}
