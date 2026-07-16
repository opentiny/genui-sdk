import { createContext, useContext, useMemo } from 'react';
import type { IMaterials } from '@opentiny/genui-sdk-core';

const defaultMaterials: IMaterials = {};

const MaterialsContext = createContext<IMaterials>(defaultMaterials);

export function useGenuiMaterials(): IMaterials {
  return useContext(MaterialsContext);
}

export interface GenuiConfigProviderProps {
  materials?: IMaterials;
  children: React.ReactNode;
}

export function GenuiConfigProvider({ materials, children }: GenuiConfigProviderProps) {
  const materialsValue = useMemo(() => materials ?? defaultMaterials, [materials]);

  return (
    <MaterialsContext.Provider value={materialsValue}>
      {children}
    </MaterialsContext.Provider>
  );
}
