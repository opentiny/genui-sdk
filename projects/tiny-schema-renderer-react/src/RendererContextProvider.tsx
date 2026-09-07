import { createContext, useContext, type ReactNode } from 'react';
import type { IRendererSettings } from './engine';

const RendererSettingsContext = createContext<IRendererSettings>({});

export function useRendererSettings(): IRendererSettings {
  return useContext(RendererSettingsContext);
}

export interface RendererContextProviderProps {
  children: ReactNode;
  'render-settings'?: IRendererSettings;
}

export function RendererContextProvider({ children, 'render-settings': renderSettings }: RendererContextProviderProps) {
  return (
    <RendererSettingsContext.Provider value={renderSettings ?? {}}>
      {children}
    </RendererSettingsContext.Provider>
  );
}
