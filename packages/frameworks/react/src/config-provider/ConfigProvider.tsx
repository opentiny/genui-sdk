import { createContext, useContext, useMemo } from 'react';
import type { IMaterials } from '@opentiny/genui-sdk-core';
import { MaterialsRuntimeRoots, useMaterialsRuntime, useSystemColorScheme } from './use-materials-runtime';
import type { NotifyHandler } from './notify.types';

const defaultMaterials: IMaterials = {};

const MaterialsContext = createContext<IMaterials>(defaultMaterials);
const NotifyContext = createContext<NotifyHandler | undefined>(undefined);

export function useGenuiMaterials(): IMaterials {
  return useContext(MaterialsContext);
}

export function useGenuiNotify(): NotifyHandler | undefined {
  return useContext(NotifyContext);
}

export interface GenuiConfigProviderProps {
  theme?: string;
  locale?: string;
  materials?: IMaterials;
  notify?: NotifyHandler;
  children: React.ReactNode;
}

export function GenuiConfigProvider({ theme, locale, materials, notify, children }: GenuiConfigProviderProps) {
  const materialsValue = useMemo(() => materials ?? defaultMaterials, [materials]);
  const systemColorScheme = useSystemColorScheme();
  const { runtimeRoots } = useMaterialsRuntime({ materials: materialsValue, theme, locale, systemColorScheme });

  return (
    <MaterialsContext.Provider value={materialsValue}>
      <NotifyContext.Provider value={notify}>
        <MaterialsRuntimeRoots roots={runtimeRoots}>{children}</MaterialsRuntimeRoots>
      </NotifyContext.Provider>
    </MaterialsContext.Provider>
  );
}
