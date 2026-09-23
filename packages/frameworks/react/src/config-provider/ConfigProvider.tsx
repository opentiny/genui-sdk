import { createContext, useContext, useMemo } from 'react';
import type { IMaterials } from '@opentiny/genui-sdk-core';
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
  materials?: IMaterials;
  notify?: NotifyHandler;
  children: React.ReactNode;
}

export function GenuiConfigProvider({ materials, notify, children }: GenuiConfigProviderProps) {
  const materialsValue = useMemo(() => materials ?? defaultMaterials, [materials]);

  return (
    <MaterialsContext.Provider value={materialsValue}>
      <NotifyContext.Provider value={notify}>{children}</NotifyContext.Provider>
    </MaterialsContext.Provider>
  );
}
