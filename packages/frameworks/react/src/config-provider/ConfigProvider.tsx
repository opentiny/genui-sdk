import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { IMaterials, ThemeColorScheme } from '@opentiny/genui-sdk-core';
import type { NotifyHandler } from './notify.types';

const defaultMaterials: IMaterials = {};

const MaterialsContext = createContext<IMaterials>(defaultMaterials);
const NotifyContext = createContext<NotifyHandler | undefined>(undefined);

export interface IGenuiConfig {
  colorScheme: ThemeColorScheme;
}

const GenuiConfigContext = createContext<IGenuiConfig>({ colorScheme: 'light' });

export type GenuiTheme = ThemeColorScheme | 'auto';

function useSystemColorScheme(enabled: boolean): ThemeColorScheme {
  const [colorScheme, setColorScheme] = useState<ThemeColorScheme>('light');

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateColorScheme = () => setColorScheme(mediaQuery.matches ? 'dark' : 'light');
    updateColorScheme();
    mediaQuery.addEventListener('change', updateColorScheme);
    return () => mediaQuery.removeEventListener('change', updateColorScheme);
  }, [enabled]);

  return colorScheme;
}

export function useGenuiMaterials(): IMaterials {
  return useContext(MaterialsContext);
}

export function useGenuiNotify(): NotifyHandler | undefined {
  return useContext(NotifyContext);
}

export function useGenuiConfig(): IGenuiConfig {
  return useContext(GenuiConfigContext);
}

export interface GenuiConfigProviderProps {
  materials?: IMaterials;
  notify?: NotifyHandler;
  theme?: GenuiTheme;
  children: React.ReactNode;
}

export function GenuiConfigProvider({ materials, notify, theme = 'light', children }: GenuiConfigProviderProps) {
  const materialsValue = useMemo(() => materials ?? defaultMaterials, [materials]);
  const systemColorScheme = useSystemColorScheme(theme === 'auto');
  const colorScheme = theme === 'auto' ? systemColorScheme : theme;
  const genuiConfig = useMemo<IGenuiConfig>(() => ({ colorScheme }), [colorScheme]);

  return (
    <GenuiConfigContext.Provider value={genuiConfig}>
      <MaterialsContext.Provider value={materialsValue}>
        <NotifyContext.Provider value={notify}>{children}</NotifyContext.Provider>
      </MaterialsContext.Provider>
    </GenuiConfigContext.Provider>
  );
}
