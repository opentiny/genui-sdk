import { createContext, useContext, type ReactNode } from 'react';
import type { IRendererSettings } from './engine';

const RendererSettingsContext = createContext<IRendererSettings>({});

export function useRendererSettings(): IRendererSettings {
  return useContext(RendererSettingsContext);
}

export interface RendererContextProviderProps {
  children: ReactNode;
  renderSettings?: IRendererSettings;
}

export function RendererContextProvider({ children, renderSettings }: RendererContextProviderProps) {
  return (
    <RendererSettingsContext.Provider value={renderSettings ?? {}}>
      {children}
    </RendererSettingsContext.Provider>
  );
}
